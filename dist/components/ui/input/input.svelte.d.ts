import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
type InputType = Exclude<HTMLInputTypeAttribute, "file">;
declare const Input: import("svelte").Component<WithElementRef<Omit<HTMLInputAttributes, "type"> & ({
    type: "file";
    files?: FileList;
} | {
    type?: InputType;
    files?: undefined;
})>, {}, "value" | "ref" | "files">;
type Input = ReturnType<typeof Input>;
export default Input;
