import type { PublicEntityOperations, PublicEntityResource } from '../runtime/entity-resource';
import type { Transport } from '../runtime/transport';
import { clientBindings } from './client-bindings';
type SchemaName<TSchemas extends Record<string, unknown>, TName extends string> = TName extends keyof TSchemas ? TSchemas[TName] : never;
type EntityClient<TSchemas extends Record<string, unknown>, TBinding extends {
    schemaName: string;
    publicOperations: PublicEntityOperations;
}> = PublicEntityResource<SchemaName<TSchemas, TBinding['schemaName']>, TBinding['publicOperations']>;
type EntityClients<TSchemas extends Record<string, unknown>> = {
    [K in keyof typeof clientBindings.entities]: EntityClient<TSchemas, typeof clientBindings.entities[K]>;
};
type CommandClients<TSchemas extends Record<string, unknown>> = {
    [K in keyof typeof clientBindings.commands]: (payload: SchemaName<TSchemas, typeof clientBindings.commands[K]['requestSchemaName']>) => Promise<SchemaName<TSchemas, typeof clientBindings.commands[K]['responseSchemaName']>>;
};
type QueryClients<TSchemas extends Record<string, unknown>> = {
    [K in keyof typeof clientBindings.queries]: (payload: SchemaName<TSchemas, typeof clientBindings.queries[K]['requestSchemaName']>) => Promise<SchemaName<TSchemas, typeof clientBindings.queries[K]['responseSchemaName']>>;
};
type AuthClients<TSchemas extends Record<string, unknown>> = {
    methods: () => Promise<SchemaName<TSchemas, 'AuthMethods'>>;
    startOtp: (payload: SchemaName<TSchemas, 'AuthStart'>) => Promise<SchemaName<TSchemas, 'AuthPrimaryStatus'>>;
    statusOtp: (payload: SchemaName<TSchemas, 'AuthChallengeInput'>) => Promise<SchemaName<TSchemas, 'AuthPrimaryStatus'>>;
    resendOtp: (payload: SchemaName<TSchemas, 'AuthResend'>) => Promise<SchemaName<TSchemas, 'AuthPrimaryStatus'>>;
    verifyOtp: (payload: SchemaName<TSchemas, 'AuthProof'>) => Promise<SchemaName<TSchemas, 'AuthOutcome'>>;
    verifyTotp: (payload: SchemaName<TSchemas, 'AuthProof'>) => Promise<SchemaName<TSchemas, 'AuthOutcome'>>;
    enroll: (payload: SchemaName<TSchemas, 'AuthEnrollmentInput'>) => Promise<SchemaName<TSchemas, 'AuthEnrollment'>>;
    confirmEnrollment: (payload: SchemaName<TSchemas, 'AuthProof'>) => Promise<SchemaName<TSchemas, 'AuthOutcome'>>;
    recover: (payload: SchemaName<TSchemas, 'AuthProof'>) => Promise<SchemaName<TSchemas, 'AuthEnrollment'>>;
    linkIdentifier: (payload: SchemaName<TSchemas, 'AuthStart'>) => Promise<SchemaName<TSchemas, 'AuthPrimaryStatus'>>;
    unlinkIdentifier: (payload: SchemaName<TSchemas, 'AuthUnlink'>) => Promise<SchemaName<TSchemas, 'AuthSuccess'>>;
    security: (payload: SchemaName<TSchemas, 'AuthEmptyInput'>) => Promise<SchemaName<TSchemas, 'AuthSecurity'>>;
    disableTotp: (payload: SchemaName<TSchemas, 'AuthEmptyInput'>) => Promise<SchemaName<TSchemas, 'AuthSuccess'>>;
    getSession: (payload: SchemaName<TSchemas, 'AuthEmptyInput'>) => Promise<SchemaName<TSchemas, 'AuthSnapshot'>>;
    accessToken: (payload: SchemaName<TSchemas, 'AuthResource'>) => Promise<SchemaName<TSchemas, 'AuthAccessToken'>>;
    signOut: (payload: SchemaName<TSchemas, 'AuthEmptyInput'>) => Promise<SchemaName<TSchemas, 'AuthSuccess'>>;
    signOutAll: (payload: SchemaName<TSchemas, 'AuthEmptyInput'>) => Promise<SchemaName<TSchemas, 'AuthSuccess'>>;
};
type AuthorizationClients<TSchemas extends Record<string, unknown>> = {
    effectiveGrants: () => Promise<SchemaName<TSchemas, 'EffectiveGrantsResponse'>>;
    profiles: () => Promise<SchemaName<TSchemas, 'AuthorizationProfilesResponse'>>;
    permissionCatalog: () => Promise<SchemaName<TSchemas, 'PermissionCatalogResponse'>>;
    scopeRender: (payload: SchemaName<TSchemas, 'ScopeRenderRequest'>) => Promise<SchemaName<TSchemas, 'ScopeRenderResponse'>>;
};
type FilesClients<TSchemas extends Record<string, unknown>> = {
    createUploadIntent: (payload: SchemaName<TSchemas, 'CreateFileUploadIntentRequest'>) => Promise<SchemaName<TSchemas, 'CreateFileUploadIntentResponse'>>;
    getDownloadUrl: (params: {
        attachmentId: string;
    }) => Promise<SchemaName<TSchemas, 'FileDownloadUrlResponse'>>;
    getContent: (params: {
        attachmentId: string;
    }) => Promise<unknown>;
};
type OnboardingClients<TSchemas extends Record<string, unknown>> = {
    registerSchool: (payload: SchemaName<TSchemas, 'OnboardingRegisterSchoolRequest'>) => Promise<SchemaName<TSchemas, 'School'>>;
    listStructureTemplates: () => Promise<SchemaName<TSchemas, 'OnboardingListStructureTemplatesResponse'>>;
    accountStatus: () => Promise<SchemaName<TSchemas, 'OnboardingAccountStatusResponse'>>;
    applyStructureTemplate: (payload: SchemaName<TSchemas, 'OnboardingApplyStructureTemplateRequest'>) => Promise<SchemaName<TSchemas, 'OnboardingApplyStructureTemplateResponse'>>;
    completeWizard: (payload: SchemaName<TSchemas, 'OnboardingCompleteWizardRequest'>) => Promise<SchemaName<TSchemas, 'OnboardingAccountStatusResponse'>>;
    inviteStaffMembers: (payload: SchemaName<TSchemas, 'OnboardingInviteStaffMembersRequest'>) => Promise<SchemaName<TSchemas, 'OnboardingInviteStaffMembersResponse'>>;
    provision: (payload: SchemaName<TSchemas, 'OnboardingProvisionRequest'>) => Promise<SchemaName<TSchemas, 'OnboardingProvisionResponse'>>;
};
type PlatformUsersClients<TSchemas extends Record<string, unknown>> = {
    me: () => Promise<SchemaName<TSchemas, 'PlatformMeResponse'>>;
    list: () => Promise<SchemaName<TSchemas, 'PlatformUserResponse'>[]>;
    create: (payload: SchemaName<TSchemas, 'CreatePlatformUserRequest'>) => Promise<SchemaName<TSchemas, 'PlatformUserResponse'>>;
    deactivate: (params: {
        id: string;
    }) => Promise<SchemaName<TSchemas, 'PlatformUserResponse'>>;
};
type PublicClients<TSchemas extends Record<string, unknown>> = {
    listMyInvitations: () => Promise<SchemaName<TSchemas, 'ListMyInvitationsResponse'>>;
    acceptMyInvitation: (params: {
        invitationId: string;
    }) => Promise<SchemaName<TSchemas, 'AcceptInvitationResponse'>>;
    previewInvitation: (params: {
        token: string;
    }) => Promise<SchemaName<TSchemas, 'InvitationPreviewResponse'>>;
    acceptInvitation: (params: {
        token: string;
    }) => Promise<SchemaName<TSchemas, 'AcceptInvitationResponse'>>;
};
type S2sClientsClients<TSchemas extends Record<string, unknown>> = {
    list: () => Promise<SchemaName<TSchemas, 'S2sClientResponse'>[]>;
    create: (payload: SchemaName<TSchemas, 'CreateS2sClientRequest'>) => Promise<SchemaName<TSchemas, 'CreateS2sClientResponse'>>;
    revoke: (params: {
        id: string;
    }) => Promise<SchemaName<TSchemas, 'S2sClientResponse'>>;
    rotateKey: (params: {
        id: string;
    }, payload: SchemaName<TSchemas, 'RotateS2sClientKeyRequest'>) => Promise<SchemaName<TSchemas, 'RotateS2sClientKeyResponse'>>;
};
type ServiceAccountsClients<TSchemas extends Record<string, unknown>> = {
    list: () => Promise<SchemaName<TSchemas, 'ServiceAccountResponse'>[]>;
    create: (payload: SchemaName<TSchemas, 'CreateServiceAccountRequest'>) => Promise<SchemaName<TSchemas, 'CreateServiceAccountResponse'>>;
    update: (params: {
        id: string;
    }, payload: SchemaName<TSchemas, 'UpdateServiceAccountRequest'>) => Promise<SchemaName<TSchemas, 'ServiceAccountResponse'>>;
    revoke: (params: {
        id: string;
    }) => Promise<SchemaName<TSchemas, 'ServiceAccountResponse'>>;
    rotateKey: (params: {
        id: string;
    }) => Promise<SchemaName<TSchemas, 'RotateServiceAccountKeyResponse'>>;
};
export interface SchoolClient<TSchemas extends Record<string, unknown>> {
    entities: EntityClients<TSchemas>;
    commands: CommandClients<TSchemas>;
    queries: QueryClients<TSchemas>;
    auth: AuthClients<TSchemas>;
    authorization: AuthorizationClients<TSchemas>;
    files: FilesClients<TSchemas>;
    onboarding: OnboardingClients<TSchemas>;
    platformUsers: PlatformUsersClients<TSchemas>;
    public: PublicClients<TSchemas>;
    s2sClients: S2sClientsClients<TSchemas>;
    serviceAccounts: ServiceAccountsClients<TSchemas>;
}
export declare function createSchoolClient<TSchemas extends Record<string, unknown>>(transport: Transport): SchoolClient<TSchemas>;
export {};
//# sourceMappingURL=create-client.d.ts.map