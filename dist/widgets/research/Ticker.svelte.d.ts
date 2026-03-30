interface TickerItem {
    symbol: string;
    price: string;
    change: string;
    changePercent?: string;
}
interface Props {
    /** Single ticker or array for a ticker strip */
    items: TickerItem[];
    class?: string;
}
declare const Ticker: import("svelte").Component<Props, {}, "">;
type Ticker = ReturnType<typeof Ticker>;
export default Ticker;
