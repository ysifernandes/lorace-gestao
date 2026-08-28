/**
 * Identificadores nominais (branded types).
 * Evitam trocar um TerritoryId por um PlayerId sem perceber.
 */
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type FactionId = Brand<string, 'FactionId'>;
export type PlayerId = Brand<string, 'PlayerId'>;
export type TerritoryId = Brand<string, 'TerritoryId'>;
export type SoldierId = Brand<string, 'SoldierId'>;
export type CardDefinitionId = Brand<string, 'CardDefinitionId'>;
export type CardInstanceId = Brand<string, 'CardInstanceId'>;

export const factionId = (v: string) => v as FactionId;
export const playerId = (v: string) => v as PlayerId;
export const territoryId = (v: string) => v as TerritoryId;
export const soldierId = (v: string) => v as SoldierId;
export const cardDefinitionId = (v: string) => v as CardDefinitionId;
export const cardInstanceId = (v: string) => v as CardInstanceId;
