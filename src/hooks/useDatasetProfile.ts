import { useState } from "react";
import { API_BASE } from "@/lib/api-client";

export interface DatasetProfile {
    profile_id: string;
    primary_type: string;
    friendly_name: string;
    rows: number;
    columns: number;
    quality_score: number;
    key_columns: string[];
    detected_focus: string;
    time_coverage: "valid" | "issue";
    validation_mode: "full" | "limitations";
    schema_preview: Array<{ name: string; type: string }>;
}

interface UseDatasetProfileReturn {
    profile: DatasetProfile | null;
    isLoading: boolean;
    error: string | null;
    profileData: (file: File) => Promise<void>;
}

/**
 * Hook to call POST /ingest-and-profile endpoint
 * Manages fast profiling state for uploaded datasets
 */
export function useDatasetProfile(): UseDatasetProfileReturn {
    const [profile, setProfile] = useState<DatasetProfile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const profileData = async (file: File): Promise<void> => {
        setIsLoading(true);
        setError(null);
        setProfile(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(`${API_BASE}/ingest-and-profile`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Profiling failed: ${response.statusText}`);
            }

            const data = await response.json();
            setProfile(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Unknown profiling error";
            setError(errorMessage);
            console.error("Dataset profiling error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        profile,
        isLoading,
        error,
        profileData,
    };
}
