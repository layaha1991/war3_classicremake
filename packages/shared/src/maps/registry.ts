export type MapId = "driftdog" | "haoren-td" | "element-td";

export interface MapDefinition {
  id: MapId;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  implemented: boolean;
}

export const MAPS: Record<MapId, MapDefinition> = {
  driftdog: {
    id: "driftdog",
    name: "秋名山甩狗",
    minPlayers: 2,
    maxPlayers: 8,
    implemented: true,
  },
  "haoren-td": {
    id: "haoren-td",
    name: "害人守塔",
    minPlayers: 1,
    maxPlayers: 8,
    implemented: false,
  },
  "element-td": {
    id: "element-td",
    name: "Element TD",
    minPlayers: 1,
    maxPlayers: 8,
    implemented: false,
  },
};

export function listMaps(): MapDefinition[] {
  return Object.values(MAPS);
}

export function getMap(id: string): MapDefinition | undefined {
  return MAPS[id as MapId];
}

export function isImplementedMap(id: string): boolean {
  return getMap(id)?.implemented === true;
}
