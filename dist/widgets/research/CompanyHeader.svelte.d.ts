interface Props {
    /** Company name */
    name: string;
    /** Stock ticker symbol */
    ticker?: string;
    /** Exchange name (NSE, NYSE, NASDAQ) */
    exchange?: string;
    /** One-line company description */
    description?: string;
    /** Logo image URL (auto-derived from domain if omitted) */
    logo?: string;
    /** Domain for auto logo (e.g. "reliance.com") */
    domain?: string;
    /** Sector / industry tags */
    tags?: string[];
    /** Current stock price */
    price?: string;
    /** Price change string (e.g. "+12.50") */
    change?: string;
    /** Price change percent (e.g. "+1.24%") */
    changePercent?: string;
    /** Market cap */
    marketCap?: string;
    class?: string;
}
declare const CompanyHeader: import("svelte").Component<Props, {}, "">;
type CompanyHeader = ReturnType<typeof CompanyHeader>;
export default CompanyHeader;
