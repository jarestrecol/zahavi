export enum EstadoDeMesa {
  LIBRE = 'LIBRE',
  OCUPADA = 'OCUPADA',
  RESERVADA = 'RESERVADA',
  EN_COBRO = 'EN_COBRO',
}

export enum TipoDeMesa {
  NORMAL = 'NORMAL',
  AD_HOC = 'AD_HOC',
}

export enum EstadoDeComanda {
  ABIERTA = 'ABIERTA',
  ENVIADA = 'ENVIADA',
  EN_PREPARACION = 'EN_PREPARACION',
  LISTA = 'LISTA',
  CERRADA = 'CERRADA',
  CANCELADA = 'CANCELADA',
}

export enum EstadoDeLinea {
  PENDIENTE = 'PENDIENTE',
  SERVIDA = 'SERVIDA',
  CANCELADA = 'CANCELADA',
}

export enum EstadoDeCobro {
  PENDIENTE = 'PENDIENTE',
  PROCESADO = 'PROCESADO',
  FALLIDO = 'FALLIDO',
  ANULADO = 'ANULADO',
}

export enum EstadoDeFactura {
  EMITIDA = 'EMITIDA',
  ANULADA = 'ANULADA',
}

export enum MetodoDePago {
  EFECTIVO = 'EFECTIVO',
  TARJETA = 'TARJETA',
  TRANSFERENCIA = 'TRANSFERENCIA',
  NEQUI = 'NEQUI',
  DATAFONO = 'DATAFONO',
}
