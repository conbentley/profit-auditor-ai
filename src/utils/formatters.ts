
export const formatCurrency = (value: number): string => 
  `£${value.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`;

export const formatPercentage = (value: number): string => 
  `${value.toFixed(2)}%`;
