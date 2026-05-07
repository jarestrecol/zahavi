import {
  type Result,
  ok,
  err,
  Email,
  Sesion,
  SesionId,
  UsuarioId,
  DispositivoId,
  type Rol,
  type HashDeContrasena,
  type HashDePin,
  type CredencialesInvalidasError,
  CredencialesInvalidasError as CredencialesInvalidasErrorImpl,
  type UsuarioNoActivoError,
  UsuarioNoActivoError as UsuarioNoActivoErrorImpl,
  type TotpNoVerificadoError,
  TotpNoVerificadoError as TotpNoVerificadoErrorImpl,
  type LimiteDeSesionesAlcanzadoError,
  LimiteDeSesionesAlcanzadoError as LimiteDeSesionesAlcanzadoErrorImpl,
  type DispositivoNoAutorizadoError,
  DispositivoNoAutorizadoError as DispositivoNoAutorizadoErrorImpl,
  CodigoTotp,
  type PinInvalidoError,
} from '@zahavi/domain-identity';
import type {
  RepositorioDeUsuarios,
  RepositorioDeSesiones,
  RepositorioDeDispositivosAutorizados,
  VerificadorDeContrasena,
  VerificadorDePin,
  VerificadorDeTotp,
  Reloj,
  GeneradorDeIds,
  PoliticaDeSesionPorRol,
  PublicadorDeDomainEvents,
} from '@zahavi/ports';

export type EntradaIniciarSesion =
  | {
      tipo: 'navegador';
      email: string;
      contrasenaEnClaro: string;
      codigoTotp?: string | undefined; // Requerido solo si el usuario tiene TOTP enrolado; SUPERADMIN siempre necesita TOTP
    }
  | {
      tipo: 'tablet';
      email: string;
      dispositivoId: string;
      pinEnClaro: string;
    };

export interface SalidaIniciarSesion {
  sesionId: string;
  usuarioId: string;
  rol: Rol;
  dispositivoId: string | null;
  expiraEnAbsolutoMs: number;
}

type ErrorIniciarSesion =
  | CredencialesInvalidasError
  | UsuarioNoActivoError
  | TotpNoVerificadoError
  | LimiteDeSesionesAlcanzadoError
  | DispositivoNoAutorizadoError
  | PinInvalidoError;

export class IniciarSesion {
  // Hashes dummy para mantener tiempo constante (anti-timing attack).
  // Se generan la primera vez que se usan, garantizando que son hashes bcrypt válidos.
  private _hashDummyContrasena: HashDeContrasena | null = null;
  private _hashDummyPin: HashDePin | null = null;

  constructor(
    private readonly reposUsuarios: RepositorioDeUsuarios,
    private readonly reposSesiones: RepositorioDeSesiones,
    private readonly reposDispositivos: RepositorioDeDispositivosAutorizados,
    private readonly verificadorContrasena: VerificadorDeContrasena,
    private readonly verificadorPin: VerificadorDePin,
    private readonly verificadorTotp: VerificadorDeTotp,
    private readonly reloj: Reloj,
    private readonly ids: GeneradorDeIds,
    private readonly politicaPorRol: PoliticaDeSesionPorRol,
    private readonly eventos: PublicadorDeDomainEvents,
  ) {}

  async execute(
    entrada: EntradaIniciarSesion,
  ): Promise<Result<SalidaIniciarSesion, ErrorIniciarSesion>> {
    if (entrada.tipo === 'navegador') {
      return this._iniciarNavegador(entrada);
    }
    return this._iniciarTablet(entrada);
  }

  private async _iniciarNavegador(
    entrada: Extract<EntradaIniciarSesion, { tipo: 'navegador' }>,
  ): Promise<Result<SalidaIniciarSesion, ErrorIniciarSesion>> {
    const emailResult = Email.of(entrada.email);
    if (!emailResult.ok) return err(new CredencialesInvalidasErrorImpl());

    const usuario = await this.reposUsuarios.obtenerPorEmail(emailResult.value);

    // Siempre ejecutar bcrypt (tiempo constante) — CRIT: no cortocircuitar cuando el usuario no existe
    const hashAVerificar =
      usuario?.credencial.tipo === 'navegador'
        ? usuario.credencial.hashDeContrasena
        : await this._dummyHashContrasena();

    const passwordOk = await this.verificadorContrasena.verificar(
      entrada.contrasenaEnClaro,
      hashAVerificar,
    );

    if (usuario === null || usuario.credencial.tipo !== 'navegador' || !passwordOk) {
      return err(new CredencialesInvalidasErrorImpl());
    }

    if (usuario.estado === 'deshabilitado') {
      return err(new UsuarioNoActivoErrorImpl(usuario.id.toString()));
    }

    const ahora = this.reloj.ahora();

    if (usuario.credencial.secretoTotp !== null) {
      // TOTP enrolado: verificar que esté confirmado y que el código sea válido
      if (!usuario.credencial.totpVerificado) {
        return err(new TotpNoVerificadoErrorImpl());
      }
      if (entrada.codigoTotp === undefined) return err(new CredencialesInvalidasErrorImpl());
      const codigoResult = CodigoTotp.of(entrada.codigoTotp);
      if (!codigoResult.ok) return err(new CredencialesInvalidasErrorImpl());
      const totpOk = await this.verificadorTotp.verificar(
        codigoResult.value,
        usuario.credencial.secretoTotp,
        ahora,
      );
      if (!totpOk) return err(new CredencialesInvalidasErrorImpl());
    } else if (usuario.rol === 'SUPERADMIN') {
      // SUPERADMIN sin TOTP enrolado: bloquear — 2FA es obligatorio
      return err(new TotpNoVerificadoErrorImpl());
    }
    // ADMIN sin TOTP: permitir login con solo contraseña

    return this._abrirSesion(usuario.id, usuario.rol, null, 'personal', ahora);
  }

  private async _iniciarTablet(
    entrada: Extract<EntradaIniciarSesion, { tipo: 'tablet' }>,
  ): Promise<Result<SalidaIniciarSesion, ErrorIniciarSesion>> {
    const dispositivoId = DispositivoId.of(entrada.dispositivoId);
    const dispositivoActivo = await this.reposDispositivos.estaActivo(dispositivoId);
    if (!dispositivoActivo) {
      return err(new DispositivoNoAutorizadoErrorImpl(entrada.dispositivoId));
    }

    const emailResult = Email.of(entrada.email);
    if (!emailResult.ok) return err(new CredencialesInvalidasErrorImpl());

    const usuario = await this.reposUsuarios.obtenerPorEmail(emailResult.value);

    // Siempre ejecutar bcrypt (tiempo constante) — CRIT: no cortocircuitar cuando el usuario no existe
    const hashAVerificar =
      usuario?.credencial.tipo === 'tablet'
        ? usuario.credencial.hashDePin
        : await this._dummyHashPin();

    const pinOk = await this.verificadorPin.verificar(entrada.pinEnClaro, hashAVerificar);

    if (usuario === null || usuario.credencial.tipo !== 'tablet' || !pinOk) {
      return err(new CredencialesInvalidasErrorImpl());
    }

    if (usuario.estado === 'deshabilitado') {
      return err(new UsuarioNoActivoErrorImpl(usuario.id.toString()));
    }

    const ahora = this.reloj.ahora();
    return this._abrirSesion(usuario.id, usuario.rol, dispositivoId, 'compartido', ahora);
  }

  private async _abrirSesion(
    usuarioId: UsuarioId,
    rol: Rol,
    dispositivoId: DispositivoId | null,
    contexto: 'personal' | 'compartido',
    ahora: ReturnType<Reloj['ahora']>,
  ): Promise<Result<SalidaIniciarSesion, LimiteDeSesionesAlcanzadoError>> {
    const politica = this.politicaPorRol.obtener(rol);
    const conteoSesiones = await this.reposSesiones.contarActivasDeUsuario(usuarioId);

    if (conteoSesiones >= politica.limiteSimultaneo) {
      return err(new LimiteDeSesionesAlcanzadoErrorImpl(politica.limiteSimultaneo));
    }

    const sesionId: SesionId = this.ids.generarSesionId();
    const eventoId = this.ids.generarEventoId();

    const sesion = Sesion.abrir(
      {
        id: sesionId,
        usuarioId,
        rol,
        dispositivoId,
        politica,
        contextoDispositivo: contexto,
        ahora,
      },
      eventoId,
    );

    await this.reposSesiones.guardar(sesion);
    await this.eventos.publicar(sesion.pullDomainEvents());

    return ok({
      sesionId: sesionId.toString(),
      usuarioId: usuarioId.toString(),
      rol,
      dispositivoId: dispositivoId?.toString() ?? null,
      expiraEnAbsolutoMs: sesion.expiraEnAbsoluto.toTimestamp(),
    });
  }

  // Genera un hash real la primera vez; las llamadas siguientes reutilizan el mismo.
  // Un string aleatorio garantiza que nunca coincida con ninguna contraseña real.
  private async _dummyHashContrasena(): Promise<HashDeContrasena> {
    if (this._hashDummyContrasena === null) {
      this._hashDummyContrasena = await this.verificadorContrasena.hashear(
        `zahavi-dummy-${Math.random().toString(36)}`,
      );
    }
    return this._hashDummyContrasena;
  }

  private async _dummyHashPin(): Promise<HashDePin> {
    if (this._hashDummyPin === null) {
      this._hashDummyPin = await this.verificadorPin.hashear(
        `zahavi-dummy-${Math.random().toString(36)}`,
      );
    }
    return this._hashDummyPin;
  }
}
