import { create } from 'zustand';

export type Rol = 'SUPERADMIN' | 'ADMIN' | 'WORKER';

const ROLES_VALIDOS: readonly Rol[] = ['SUPERADMIN', 'ADMIN', 'WORKER'];

function parseRol(value: string | null): Rol | null {
  if (value !== null && (ROLES_VALIDOS as readonly string[]).includes(value)) {
    return value as Rol;
  }
  return null;
}

interface AuthState {
  token: string | null;
  usuarioId: string | null;
  rol: Rol | null;
  buId: string | null;
  setAuth: (token: string, usuarioId: string, rol: Rol, buId: string | null) => void;
  setBuId: (buId: string, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('zahavi_token'),
  usuarioId: localStorage.getItem('zahavi_usuario_id'),
  rol: parseRol(localStorage.getItem('zahavi_rol')),
  buId: localStorage.getItem('zahavi_bu_id'),

  setAuth: (token, usuarioId, rol, buId) => {
    localStorage.setItem('zahavi_token', token);
    localStorage.setItem('zahavi_usuario_id', usuarioId);
    localStorage.setItem('zahavi_rol', rol);
    if (buId) localStorage.setItem('zahavi_bu_id', buId);
    else localStorage.removeItem('zahavi_bu_id');
    set({ token, usuarioId, rol, buId });
  },

  setBuId: (buId, token) => {
    localStorage.setItem('zahavi_bu_id', buId);
    localStorage.setItem('zahavi_token', token);
    set({ buId, token });
  },

  logout: () => {
    localStorage.removeItem('zahavi_token');
    localStorage.removeItem('zahavi_usuario_id');
    localStorage.removeItem('zahavi_rol');
    localStorage.removeItem('zahavi_bu_id');
    set({ token: null, usuarioId: null, rol: null, buId: null });
  },
}));
