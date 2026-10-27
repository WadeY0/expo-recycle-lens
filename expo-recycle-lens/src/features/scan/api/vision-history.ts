import { httpClient } from "@/shared/api/http-client";
import { PRIVATE_ROUTES } from "@/shared/api/private-routes";
import type {
  VisionHistoryResponse,
  VisionDetail,
} from "../types/vision.types";

export async function getVisionHistoryApi(params?: {
  page?: number;
  perPage?: number;
}): Promise<VisionHistoryResponse> {
  const { data } = await httpClient.get<VisionHistoryResponse>(
    PRIVATE_ROUTES.visionHistory,
    {
      params,
    },
  );

  return data;
}

export async function getVisionDetailApi(id: string): Promise<VisionDetail> {
  const { data } = await httpClient.get<VisionDetail>(
    `${PRIVATE_ROUTES.visionHistory}/${id}`,
  );
  return data;
}
