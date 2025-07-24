import React from "react";
import InitialSummary from "./InitialSummary";

export default function FinalSummary() {
  return (
    <InitialSummary 
      statusType="final"
      title="📊 Panel wise Reconciliation Summary - Final Status"
      showToggle={false}
    />
  );
} 