
export interface SpreadsheetAnalysis {
  total_rows: number;
  financial_metrics: {
    total_revenue: number;
    total_cost: number;
    total_profit: number;
    profit_margin: number;
    expense_ratio: number;
  };
  ai_analysis?: string;
  processed_at: string;
}

export interface SpreadsheetUpload {
  id: string;
  user_id: string;
  file_path: string;
  file_type: string;
  filename: string;
  uploaded_at: string;
  processed: boolean;
  analysis_results: SpreadsheetAnalysis;
  row_count: number | null;
  processing_error: string | null;
}
