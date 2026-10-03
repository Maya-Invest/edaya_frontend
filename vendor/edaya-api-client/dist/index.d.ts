export { createSchoolClient, type SchoolClient } from './generated/create-client';
export { clientBindings, type ClientBindings } from './generated/client-bindings';
export { ApiError } from './runtime/errors';
export { unwrapEntity, unwrapEntityList } from './runtime/entity-envelope';
export { type BaseEntityResource, type DirectSaveEntityResource, type EntityQuery, EntityResource, } from './runtime/entity-resource';
export { resolveClientRoutePath, schoolApiPath, SCHOOL_API_BASE_PATH } from './runtime/paths';
export { type Transport, type TransportRequestOptions } from './runtime/transport';
import type { Transport } from './runtime/transport';
import type { components } from './schema';
/** Account session transport, independent of school JWT exchange. */
export declare function createAuthClient(transport: Transport): {
    methods: () => Promise<{
        methods: {
            key: string;
            kind: "email" | "phone";
            available?: boolean;
            channels?: string[];
            countries?: string[];
            prefixes?: string[];
        }[];
    }>;
    startOtp: (payload: {
        kind: "email" | "phone";
        value: string;
        channel?: "email" | "telegram" | "whatsapp";
        locale?: "fr" | "en";
        requestId?: string;
        recoveryEligible?: boolean;
    }) => Promise<{
        state: "primary_required";
        challenge: string;
        lifecycle: "pending" | "expired" | "superseded" | "completed" | "exhausted";
        channel: "email" | "whatsapp" | "sms";
        delivery: "pending" | "accepted" | "uncertain" | "failed" | "sent" | "delivered" | "read";
        expiresAt: number;
        nextResendAt: number;
        serverNow: number;
        actions: {
            resend: boolean;
            sms: boolean;
        };
        resendAfter?: number;
    }>;
    statusOtp: (payload: {
        challenge: string;
    }) => Promise<{
        state: "primary_required";
        challenge: string;
        lifecycle: "pending" | "expired" | "superseded" | "completed" | "exhausted";
        channel: "email" | "whatsapp" | "sms";
        delivery: "pending" | "accepted" | "uncertain" | "failed" | "sent" | "delivered" | "read";
        expiresAt: number;
        nextResendAt: number;
        serverNow: number;
        actions: {
            resend: boolean;
            sms: boolean;
        };
        resendAfter?: number;
    }>;
    resendOtp: (payload: {
        challenge: string;
    } & {
        action: "resend" | "sms";
        requestId: string;
    }) => Promise<{
        state: "primary_required";
        challenge: string;
        lifecycle: "pending" | "expired" | "superseded" | "completed" | "exhausted";
        channel: "email" | "whatsapp" | "sms";
        delivery: "pending" | "accepted" | "uncertain" | "failed" | "sent" | "delivered" | "read";
        expiresAt: number;
        nextResendAt: number;
        serverNow: number;
        actions: {
            resend: boolean;
            sms: boolean;
        };
        resendAfter?: number;
    }>;
    verifyOtp: (payload: {
        challenge: string;
        code: string;
    }) => Promise<{
        state: "primary_required";
        challenge: string;
        lifecycle: "pending" | "expired" | "superseded" | "completed" | "exhausted";
        channel: "email" | "whatsapp" | "sms";
        delivery: "pending" | "accepted" | "uncertain" | "failed" | "sent" | "delivered" | "read";
        expiresAt: number;
        nextResendAt: number;
        serverNow: number;
        actions: {
            resend: boolean;
            sms: boolean;
        };
        resendAfter?: number;
    } | {
        state: "enrollment_required";
        challenge: string;
        secret?: string;
        uri?: string;
    } | ({
        account: components["schemas"]["AuthAccount"];
        user: components["schemas"]["AuthUser"];
        session: components["schemas"]["AuthSession"];
    } & {
        state: "complete";
        token?: string;
        recoveryCodes?: string[];
    }) | {
        state: "linked";
        account: components["schemas"]["AuthAccount"];
    } | {
        state: "totp_required";
        challenge: string;
    }>;
    verifyTotp: (payload: {
        challenge: string;
        code: string;
    }) => Promise<{
        state: "primary_required";
        challenge: string;
        lifecycle: "pending" | "expired" | "superseded" | "completed" | "exhausted";
        channel: "email" | "whatsapp" | "sms";
        delivery: "pending" | "accepted" | "uncertain" | "failed" | "sent" | "delivered" | "read";
        expiresAt: number;
        nextResendAt: number;
        serverNow: number;
        actions: {
            resend: boolean;
            sms: boolean;
        };
        resendAfter?: number;
    } | {
        state: "enrollment_required";
        challenge: string;
        secret?: string;
        uri?: string;
    } | ({
        account: components["schemas"]["AuthAccount"];
        user: components["schemas"]["AuthUser"];
        session: components["schemas"]["AuthSession"];
    } & {
        state: "complete";
        token?: string;
        recoveryCodes?: string[];
    }) | {
        state: "linked";
        account: components["schemas"]["AuthAccount"];
    } | {
        state: "totp_required";
        challenge: string;
    }>;
    enroll: (payload: {
        challenge?: string;
    }) => Promise<{
        state: "enrollment_required";
        challenge: string;
        secret?: string;
        uri?: string;
    }>;
    confirmEnrollment: (payload: {
        challenge: string;
        code: string;
    }) => Promise<{
        state: "primary_required";
        challenge: string;
        lifecycle: "pending" | "expired" | "superseded" | "completed" | "exhausted";
        channel: "email" | "whatsapp" | "sms";
        delivery: "pending" | "accepted" | "uncertain" | "failed" | "sent" | "delivered" | "read";
        expiresAt: number;
        nextResendAt: number;
        serverNow: number;
        actions: {
            resend: boolean;
            sms: boolean;
        };
        resendAfter?: number;
    } | {
        state: "enrollment_required";
        challenge: string;
        secret?: string;
        uri?: string;
    } | ({
        account: components["schemas"]["AuthAccount"];
        user: components["schemas"]["AuthUser"];
        session: components["schemas"]["AuthSession"];
    } & {
        state: "complete";
        token?: string;
        recoveryCodes?: string[];
    }) | {
        state: "linked";
        account: components["schemas"]["AuthAccount"];
    } | {
        state: "totp_required";
        challenge: string;
    }>;
    recover: (payload: {
        challenge: string;
        code: string;
    }) => Promise<{
        state: "enrollment_required";
        challenge: string;
        secret?: string;
        uri?: string;
    }>;
    linkIdentifier: (payload: {
        kind: "email" | "phone";
        value: string;
        channel?: "email" | "telegram" | "whatsapp";
        locale?: "fr" | "en";
        requestId?: string;
        recoveryEligible?: boolean;
    }) => Promise<{
        state: "primary_required";
        challenge: string;
        lifecycle: "pending" | "expired" | "superseded" | "completed" | "exhausted";
        channel: "email" | "whatsapp" | "sms";
        delivery: "pending" | "accepted" | "uncertain" | "failed" | "sent" | "delivered" | "read";
        expiresAt: number;
        nextResendAt: number;
        serverNow: number;
        actions: {
            resend: boolean;
            sms: boolean;
        };
        resendAfter?: number;
    }>;
    unlinkIdentifier: (payload: {
        identifierId: string;
    }) => Promise<{
        success: true;
    }>;
    security: (payload: Record<string, never>) => Promise<{
        totpEnabled: boolean;
        totpRequired: boolean;
    }>;
    disableTotp: (payload: Record<string, never>) => Promise<{
        success: true;
    }>;
    getSession: (payload: Record<string, never>) => Promise<{
        account: components["schemas"]["AuthAccount"];
        user: components["schemas"]["AuthUser"];
        session: components["schemas"]["AuthSession"];
    }>;
    accessToken: (payload: {
        resource: string;
    }) => Promise<{
        accessToken: string;
        tokenType: "Bearer";
        expiresAt: string;
    }>;
    signOut: (payload: Record<string, never>) => Promise<{
        success: true;
    }>;
    signOutAll: (payload: Record<string, never>) => Promise<{
        success: true;
    }>;
};
export type AuthClient = ReturnType<typeof createAuthClient>;
//# sourceMappingURL=index.d.ts.map