export declare const api: import("axios").AxiosInstance;
export declare const useVault: () => import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare const useQueue: () => import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare const useAnalysis: (docId: number | null) => import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare const useCompliance: (docId: number | null) => import("@tanstack/react-query").UseQueryResult<any, Error>;
export declare const useRedact: () => import("@tanstack/react-query").UseMutationResult<any, Error, {
    docId: number;
    entityIds: number[];
}, unknown>;
export declare const useChat: () => import("@tanstack/react-query").UseMutationResult<any, Error, {
    message: string;
    docId?: number;
}, unknown>;
