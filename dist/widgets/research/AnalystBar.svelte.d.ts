interface Props {
    /** Number of Buy/Overweight ratings */
    buy?: number;
    /** Number of Hold ratings */
    hold?: number;
    /** Number of Sell/Underweight ratings */
    sell?: number;
    /** Consensus label (e.g. "Overweight", "Buy") */
    consensus?: string;
    /** Average target price */
    target?: string;
    class?: string;
}
declare const AnalystBar: import("svelte").Component<Props, {}, "">;
type AnalystBar = ReturnType<typeof AnalystBar>;
export default AnalystBar;
