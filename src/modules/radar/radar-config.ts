export function radarTableName(): string {
  const name = process.env.RADAR_TABLE_NAME;
  if (!name) throw new Error("RADAR_TABLE_NAME is required");
  return name;
}
export interface RadarEnvironment { environment: "dev"; table: string; region: string; mediaBaseUrl: string; }
