export interface DeviceTrustReport {
    isJailbroken: boolean;
    isEmulator: boolean;
    biometricSupported: boolean;
    integrityPassed: boolean;
    platform: string;
}
export declare class DeviceSecurity {
    /**
     * Evaluates device state for rooting, jailbreak, or emulator status.
     */
    static evaluateDeviceTrust(): Promise<DeviceTrustReport>;
    /**
     * Interacts with SecureStore for encrypting sensitive offline tokens.
     */
    static saveEncryptedData(key: string, value: string): Promise<boolean>;
    static getEncryptedData(key: string): Promise<string | null>;
    static deleteEncryptedData(key: string): Promise<boolean>;
}
