import type { DispositivoAutorizado, DispositivoId } from '@zahavi/domain-identity';

export interface RepositorioDeDispositivosAutorizados {
  obtenerPorId(id: DispositivoId): Promise<DispositivoAutorizado | null>;
  guardar(dispositivo: DispositivoAutorizado): Promise<void>;
  existeNombre(nombre: string): Promise<boolean>;
  listarActivos(): Promise<DispositivoAutorizado[]>;
  estaActivo(id: DispositivoId): Promise<boolean>;
}
