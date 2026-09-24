import axios from 'axios';
import type { MatchAnalysis, EvaluationMetrics } from '../types/cricket';

const API_BASE_URL = 'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const getDemoMatch = async (): Promise<MatchAnalysis> => {
  const response = await apiClient.get<MatchAnalysis>('/api/demo-match');
  return response.data;
};

export const getFieldConfig = async () => {
  const response = await apiClient.get('/api/config/field');
  return response.data;
};

export const updateCalibration = async (cameraPixels: number[][], fieldMeters?: number[][]) => {
  const response = await apiClient.post('/api/calibration/update', {
    camera_pixels: cameraPixels,
    field_meters: fieldMeters
  });
  return response.data;
};

export const uploadAndAnalyzeVideo = async (file: File, sampleStride: number = 1) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sample_stride', sampleStride.toString());

  const response = await apiClient.post('/api/analyze-video', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getJobStatus = async (jobId: string) => {
  const response = await apiClient.get(`/api/jobs/${jobId}`);
  return response.data;
};

export const getEvaluationMetrics = async (): Promise<EvaluationMetrics> => {
  const response = await apiClient.get<EvaluationMetrics>('/api/evaluation/metrics');
  return response.data;
};
