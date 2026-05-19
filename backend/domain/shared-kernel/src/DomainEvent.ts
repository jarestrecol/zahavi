export interface DomainEvent {
  readonly eventoId: string;
  readonly tipo: string;
  readonly aggregateId: string;
  readonly ocurridoEn: number;
  readonly version: number;
}
