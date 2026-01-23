export type ArtifactStatus = "success" | "failed";

export interface ValidatedArtifact {
  valid?: boolean;
  status?: ArtifactStatus;
}

export function isValidArtifact(artifact: ValidatedArtifact | null | undefined): boolean {
  return Boolean(artifact && artifact.valid === true && artifact.status === "success");
}
