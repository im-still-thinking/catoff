import { useContext } from "react";
import { WalletAuthContext } from "@/contexts/WalletAuthContext";

export function useWalletAuth() {
    const context = useContext(WalletAuthContext);
    if (context === undefined) {
        throw new Error(
            "useWalletAuth must be used within a WalletAuthProvider",
        );
    }
    return context;
}
