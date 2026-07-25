import type { AgentResult } from "@/lib/types/agents";
import { ResultFinance } from "@/components/product/results/ResultFinance";
import { ResultTravel } from "@/components/product/results/ResultTravel";
import { ResultSecurity } from "@/components/product/results/ResultSecurity";
import { ResultDocument } from "@/components/product/results/ResultDocument";

/**
 * Dispatcher over the specialist result union. Adding a fifth agent post-
 * hackathon means one case here plus one result component — nothing else.
 */
export function AgentResultCard({ result }: { result: AgentResult }) {
  switch (result.agent) {
    case "FinanceAgent":
      return <ResultFinance output={result.output} />;
    case "TravelAgent":
      return <ResultTravel output={result.output} />;
    case "SecurityAgent":
      return <ResultSecurity output={result.output} />;
    case "DocumentAgent":
      return <ResultDocument output={result.output} />;
  }
}
