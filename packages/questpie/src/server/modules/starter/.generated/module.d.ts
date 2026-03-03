import _coll_account from "../collections/account";
import _coll_apikey from "../collections/apikey";
import _coll_assets from "../collections/assets";
import _coll_session from "../collections/session";
import _coll_user from "../collections/user";
import _coll_verification from "../collections/verification";
import _job_realtimeCleanup from "../jobs/realtime-cleanup";
import _fields from "../fields";
export interface StarterCollections {
    account: typeof _coll_account;
    apikey: typeof _coll_apikey;
    assets: typeof _coll_assets;
    session: typeof _coll_session;
    user: typeof _coll_user;
    verification: typeof _coll_verification;
}
export interface StarterJobs {
    realtimeCleanup: typeof _job_realtimeCleanup;
}
declare const _module: {
    name: "questpie-starter";
    collections: StarterCollections;
    jobs: StarterJobs;
    messages: {
        en: {
            readonly en: {
                readonly "error.notFound": "Resource not found";
                readonly "error.notFound.withId": "{{resource}} with ID {{id}} not found";
                readonly "error.forbidden": "Access forbidden";
                readonly "error.unauthorized": "Unauthorized";
                readonly "error.validation": "Validation failed";
                readonly "error.internal": "Internal server error";
                readonly "error.badRequest": "Bad request";
                readonly "error.conflict": "Resource conflict";
                readonly "error.notImplemented": "Not implemented";
                readonly "error.timeout": "Request timeout";
                readonly "crud.create.forbidden": "You don't have permission to create this resource";
                readonly "crud.read.forbidden": "You don't have permission to read this resource";
                readonly "crud.update.forbidden": "You don't have permission to update this resource";
                readonly "crud.delete.forbidden": "You don't have permission to delete this resource";
                readonly "crud.notFound": "{{resource}} not found";
                readonly "validation.required": "{{field}} is required";
                readonly "validation.invalidType": "{{field}} must be a {{expected}}";
                readonly "validation.string.tooSmall": "{{field}} must be at least {{min}} characters";
                readonly "validation.string.tooBig": "{{field}} must be at most {{max}} characters";
                readonly "validation.string.email": "{{field}} must be a valid email";
                readonly "validation.string.url": "{{field}} must be a valid URL";
                readonly "validation.string.uuid": "{{field}} must be a valid UUID";
                readonly "validation.string.regex": "{{field}} has invalid format";
                readonly "validation.number.tooSmall": "{{field}} must be at least {{min}}";
                readonly "validation.number.tooBig": "{{field}} must be at most {{max}}";
                readonly "validation.number.notInteger": "{{field}} must be an integer";
                readonly "validation.number.notPositive": "{{field}} must be positive";
                readonly "validation.number.notNegative": "{{field}} must be negative";
                readonly "validation.array.tooSmall": "{{field}} must have at least {{min}} items";
                readonly "validation.array.tooBig": "{{field}} must have at most {{max}} items";
                readonly "validation.date.invalid": "{{field}} must be a valid date";
                readonly "validation.date.tooEarly": "{{field}} must be after {{min}}";
                readonly "validation.date.tooLate": "{{field}} must be before {{max}}";
                readonly "auth.invalidCredentials": "Invalid credentials";
                readonly "auth.sessionExpired": "Session expired";
                readonly "auth.tokenInvalid": "Invalid token";
                readonly "auth.tokenExpired": "Token expired";
                readonly "auth.accountLocked": "Account locked";
                readonly "auth.emailNotVerified": "Email not verified";
                readonly "auth.userNotFound": "User not found";
                readonly "auth.userAlreadyExists": "User already exists";
                readonly "upload.tooLarge": "File too large (max {{max}})";
                readonly "upload.invalidType": "Invalid file type. Allowed: {{allowed}}";
                readonly "upload.failed": "Upload failed";
                readonly "hook.beforeCreate.failed": "Pre-create validation failed";
                readonly "hook.afterCreate.failed": "Post-create processing failed";
                readonly "hook.beforeUpdate.failed": "Pre-update validation failed";
                readonly "hook.afterUpdate.failed": "Post-update processing failed";
                readonly "hook.beforeDelete.failed": "Pre-delete validation failed";
                readonly "hook.afterDelete.failed": "Post-delete processing failed";
                readonly "hook.validate.failed": "Validation hook failed";
                readonly "access.denied": "Access denied";
                readonly "access.fieldDenied": "Access to field {{field}} denied";
                readonly "access.operationDenied": "Operation {{operation}} not allowed";
                readonly "error.database.uniqueViolation": "{{field}} already exists";
                readonly "error.database.foreignKeyViolation": "Referenced {{resource}} does not exist";
                readonly "error.database.notNullViolation": "{{field}} cannot be null";
                readonly "error.database.checkViolation": "{{field}} violates check constraint";
            };
        };
    };
    globals: {};
    functions: {};
    routes: {};
    services: {};
    emails: {};
    migrations: readonly [];
    seeds: readonly [];
    auth: {
        baseURL: string | undefined;
        secret: string | undefined;
        advanced: {
            useSecureCookies: boolean;
        };
        plugins: [{
            id: "admin";
            init(): {
                options: {
                    databaseHooks: {
                        user: {
                            create: {
                                before(user: {
                                    id: string;
                                    createdAt: Date;
                                    updatedAt: Date;
                                    email: string;
                                    emailVerified: boolean;
                                    name: string;
                                    image?: string | null | undefined;
                                } & Record<string, unknown>): Promise<{
                                    data: {
                                        id: string;
                                        createdAt: Date;
                                        updatedAt: Date;
                                        email: string;
                                        emailVerified: boolean;
                                        name: string;
                                        image?: string | null | undefined;
                                        role: string;
                                    };
                                }>;
                            };
                        };
                        session: {
                            create: {
                                before(session: {
                                    id: string;
                                    createdAt: Date;
                                    updatedAt: Date;
                                    userId: string;
                                    expiresAt: Date;
                                    token: string;
                                    ipAddress?: string | null | undefined;
                                    userAgent?: string | null | undefined;
                                } & Record<string, unknown>, ctx: import("better-auth").GenericEndpointContext | null): Promise<void>;
                            };
                        };
                    };
                };
            };
            hooks: {
                after: {
                    matcher(context: import("better-auth").HookEndpointContext): boolean;
                    handler: (inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<import("better-auth/plugins").SessionWithImpersonatedBy[] | undefined>;
                }[];
            };
            endpoints: {
                setRole: import("better-auth").StrictEndpoint<"/admin/set-role", {
                    method: "POST";
                    body: import("zod").ZodObject<{
                        userId: import("zod").ZodCoercedString<unknown>;
                        role: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>]>;
                    }, import("better-auth").$strip>;
                    requireHeaders: true;
                    use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        session: {
                            user: import("better-auth/plugins").UserWithRole;
                            session: import("better-auth").Session;
                        };
                    }>)[];
                    metadata: {
                        openapi: {
                            operationId: string;
                            summary: string;
                            description: string;
                            responses: {
                                200: {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    user: {
                                                        $ref: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                        $Infer: {
                            body: {
                                userId: string;
                                role: "user" | "admin" | ("user" | "admin")[];
                            };
                        };
                    };
                }, {
                    user: import("better-auth/plugins").UserWithRole;
                }>;
                getUser: import("better-auth").StrictEndpoint<"/admin/get-user", {
                    method: "GET";
                    query: import("zod").ZodObject<{
                        id: import("zod").ZodString;
                    }, import("better-auth").$strip>;
                    use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        session: {
                            user: import("better-auth/plugins").UserWithRole;
                            session: import("better-auth").Session;
                        };
                    }>)[];
                    metadata: {
                        openapi: {
                            operationId: string;
                            summary: string;
                            description: string;
                            responses: {
                                200: {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    user: {
                                                        $ref: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                }, import("better-auth/plugins").UserWithRole>;
                createUser: import("better-auth").StrictEndpoint<"/admin/create-user", {
                    method: "POST";
                    body: import("zod").ZodObject<{
                        email: import("zod").ZodString;
                        password: import("zod").ZodOptional<import("zod").ZodString>;
                        name: import("zod").ZodString;
                        role: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>]>>;
                        data: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
                    }, import("better-auth").$strip>;
                    metadata: {
                        openapi: {
                            operationId: string;
                            summary: string;
                            description: string;
                            responses: {
                                200: {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    user: {
                                                        $ref: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                        $Infer: {
                            body: {
                                email: string;
                                password?: string | undefined;
                                name: string;
                                role?: "user" | "admin" | ("user" | "admin")[] | undefined;
                                data?: Record<string, any> | undefined;
                            };
                        };
                    };
                }, {
                    user: import("better-auth/plugins").UserWithRole;
                }>;
                adminUpdateUser: import("better-auth").StrictEndpoint<"/admin/update-user", {
                    method: "POST";
                    body: import("zod").ZodObject<{
                        userId: import("zod").ZodCoercedString<unknown>;
                        data: import("zod").ZodRecord<import("zod").ZodAny, import("zod").ZodAny>;
                    }, import("better-auth").$strip>;
                    use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        session: {
                            user: import("better-auth/plugins").UserWithRole;
                            session: import("better-auth").Session;
                        };
                    }>)[];
                    metadata: {
                        openapi: {
                            operationId: string;
                            summary: string;
                            description: string;
                            responses: {
                                200: {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    user: {
                                                        $ref: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                }, import("better-auth/plugins").UserWithRole>;
                listUsers: import("better-auth").StrictEndpoint<"/admin/list-users", {
                    method: "GET";
                    use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        session: {
                            user: import("better-auth/plugins").UserWithRole;
                            session: import("better-auth").Session;
                        };
                    }>)[];
                    query: import("zod").ZodObject<{
                        searchValue: import("zod").ZodOptional<import("zod").ZodString>;
                        searchField: import("zod").ZodOptional<import("zod").ZodEnum<{
                            name: "name";
                            email: "email";
                        }>>;
                        searchOperator: import("zod").ZodOptional<import("zod").ZodEnum<{
                            contains: "contains";
                            starts_with: "starts_with";
                            ends_with: "ends_with";
                        }>>;
                        limit: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber]>>;
                        offset: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber]>>;
                        sortBy: import("zod").ZodOptional<import("zod").ZodString>;
                        sortDirection: import("zod").ZodOptional<import("zod").ZodEnum<{
                            asc: "asc";
                            desc: "desc";
                        }>>;
                        filterField: import("zod").ZodOptional<import("zod").ZodString>;
                        filterValue: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber]>, import("zod").ZodBoolean]>>;
                        filterOperator: import("zod").ZodOptional<import("zod").ZodEnum<{
                            eq: "eq";
                            ne: "ne";
                            lt: "lt";
                            lte: "lte";
                            gt: "gt";
                            gte: "gte";
                            contains: "contains";
                        }>>;
                    }, import("better-auth").$strip>;
                    metadata: {
                        openapi: {
                            operationId: string;
                            summary: string;
                            description: string;
                            responses: {
                                200: {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    users: {
                                                        type: string;
                                                        items: {
                                                            $ref: string;
                                                        };
                                                    };
                                                    total: {
                                                        type: string;
                                                    };
                                                    limit: {
                                                        type: string;
                                                    };
                                                    offset: {
                                                        type: string;
                                                    };
                                                };
                                                required: string[];
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                }, {
                    users: import("better-auth/plugins").UserWithRole[];
                    total: number;
                    limit: number | undefined;
                    offset: number | undefined;
                } | {
                    users: never[];
                    total: number;
                }>;
                listUserSessions: import("better-auth").StrictEndpoint<"/admin/list-user-sessions", {
                    method: "POST";
                    use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        session: {
                            user: import("better-auth/plugins").UserWithRole;
                            session: import("better-auth").Session;
                        };
                    }>)[];
                    body: import("zod").ZodObject<{
                        userId: import("zod").ZodCoercedString<unknown>;
                    }, import("better-auth").$strip>;
                    metadata: {
                        openapi: {
                            operationId: string;
                            summary: string;
                            description: string;
                            responses: {
                                200: {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    sessions: {
                                                        type: string;
                                                        items: {
                                                            $ref: string;
                                                        };
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                }, {
                    sessions: import("better-auth/plugins").SessionWithImpersonatedBy[];
                }>;
                unbanUser: import("better-auth").StrictEndpoint<"/admin/unban-user", {
                    method: "POST";
                    body: import("zod").ZodObject<{
                        userId: import("zod").ZodCoercedString<unknown>;
                    }, import("better-auth").$strip>;
                    use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        session: {
                            user: import("better-auth/plugins").UserWithRole;
                            session: import("better-auth").Session;
                        };
                    }>)[];
                    metadata: {
                        openapi: {
                            operationId: string;
                            summary: string;
                            description: string;
                            responses: {
                                200: {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    user: {
                                                        $ref: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                }, {
                    user: import("better-auth/plugins").UserWithRole;
                }>;
                banUser: import("better-auth").StrictEndpoint<"/admin/ban-user", {
                    method: "POST";
                    body: import("zod").ZodObject<{
                        userId: import("zod").ZodCoercedString<unknown>;
                        banReason: import("zod").ZodOptional<import("zod").ZodString>;
                        banExpiresIn: import("zod").ZodOptional<import("zod").ZodNumber>;
                    }, import("better-auth").$strip>;
                    use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        session: {
                            user: import("better-auth/plugins").UserWithRole;
                            session: import("better-auth").Session;
                        };
                    }>)[];
                    metadata: {
                        openapi: {
                            operationId: string;
                            summary: string;
                            description: string;
                            responses: {
                                200: {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    user: {
                                                        $ref: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                }, {
                    user: import("better-auth/plugins").UserWithRole;
                }>;
                impersonateUser: import("better-auth").StrictEndpoint<"/admin/impersonate-user", {
                    method: "POST";
                    body: import("zod").ZodObject<{
                        userId: import("zod").ZodCoercedString<unknown>;
                    }, import("better-auth").$strip>;
                    use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        session: {
                            user: import("better-auth/plugins").UserWithRole;
                            session: import("better-auth").Session;
                        };
                    }>)[];
                    metadata: {
                        openapi: {
                            operationId: string;
                            summary: string;
                            description: string;
                            responses: {
                                200: {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    session: {
                                                        $ref: string;
                                                    };
                                                    user: {
                                                        $ref: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                }, {
                    session: {
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        expiresAt: Date;
                        token: string;
                        ipAddress?: string | null | undefined;
                        userAgent?: string | null | undefined;
                    };
                    user: import("better-auth/plugins").UserWithRole;
                }>;
                stopImpersonating: import("better-auth").StrictEndpoint<"/admin/stop-impersonating", {
                    method: "POST";
                    requireHeaders: true;
                }, {
                    session: {
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        userId: string;
                        expiresAt: Date;
                        token: string;
                        ipAddress?: string | null | undefined;
                        userAgent?: string | null | undefined;
                    } & Record<string, any>;
                    user: {
                        id: string;
                        createdAt: Date;
                        updatedAt: Date;
                        email: string;
                        emailVerified: boolean;
                        name: string;
                        image?: string | null | undefined;
                    } & Record<string, any>;
                }>;
                revokeUserSession: import("better-auth").StrictEndpoint<"/admin/revoke-user-session", {
                    method: "POST";
                    body: import("zod").ZodObject<{
                        sessionToken: import("zod").ZodString;
                    }, import("better-auth").$strip>;
                    use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        session: {
                            user: import("better-auth/plugins").UserWithRole;
                            session: import("better-auth").Session;
                        };
                    }>)[];
                    metadata: {
                        openapi: {
                            operationId: string;
                            summary: string;
                            description: string;
                            responses: {
                                200: {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    success: {
                                                        type: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                }, {
                    success: boolean;
                }>;
                revokeUserSessions: import("better-auth").StrictEndpoint<"/admin/revoke-user-sessions", {
                    method: "POST";
                    body: import("zod").ZodObject<{
                        userId: import("zod").ZodCoercedString<unknown>;
                    }, import("better-auth").$strip>;
                    use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        session: {
                            user: import("better-auth/plugins").UserWithRole;
                            session: import("better-auth").Session;
                        };
                    }>)[];
                    metadata: {
                        openapi: {
                            operationId: string;
                            summary: string;
                            description: string;
                            responses: {
                                200: {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    success: {
                                                        type: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                }, {
                    success: boolean;
                }>;
                removeUser: import("better-auth").StrictEndpoint<"/admin/remove-user", {
                    method: "POST";
                    body: import("zod").ZodObject<{
                        userId: import("zod").ZodCoercedString<unknown>;
                    }, import("better-auth").$strip>;
                    use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        session: {
                            user: import("better-auth/plugins").UserWithRole;
                            session: import("better-auth").Session;
                        };
                    }>)[];
                    metadata: {
                        openapi: {
                            operationId: string;
                            summary: string;
                            description: string;
                            responses: {
                                200: {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    success: {
                                                        type: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                }, {
                    success: boolean;
                }>;
                setUserPassword: import("better-auth").StrictEndpoint<"/admin/set-user-password", {
                    method: "POST";
                    body: import("zod").ZodObject<{
                        newPassword: import("zod").ZodString;
                        userId: import("zod").ZodCoercedString<unknown>;
                    }, import("better-auth").$strip>;
                    use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        session: {
                            user: import("better-auth/plugins").UserWithRole;
                            session: import("better-auth").Session;
                        };
                    }>)[];
                    metadata: {
                        openapi: {
                            operationId: string;
                            summary: string;
                            description: string;
                            responses: {
                                200: {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    status: {
                                                        type: string;
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                }, {
                    status: boolean;
                }>;
                userHasPermission: import("better-auth").StrictEndpoint<"/admin/has-permission", {
                    method: "POST";
                    body: import("zod").ZodIntersection<import("zod").ZodObject<{
                        userId: import("zod").ZodOptional<import("zod").ZodCoercedString<unknown>>;
                        role: import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("better-auth").$strip>, import("zod").ZodUnion<readonly [import("zod").ZodObject<{
                        permission: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>>;
                        permissions: import("zod").ZodUndefined;
                    }, import("better-auth").$strip>, import("zod").ZodObject<{
                        permission: import("zod").ZodUndefined;
                        permissions: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>>;
                    }, import("better-auth").$strip>]>>;
                    metadata: {
                        openapi: {
                            description: string;
                            requestBody: {
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                permission: {
                                                    type: string;
                                                    description: string;
                                                    deprecated: boolean;
                                                };
                                                permissions: {
                                                    type: string;
                                                    description: string;
                                                };
                                            };
                                            required: string[];
                                        };
                                    };
                                };
                            };
                            responses: {
                                "200": {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    error: {
                                                        type: string;
                                                    };
                                                    success: {
                                                        type: string;
                                                    };
                                                };
                                                required: string[];
                                            };
                                        };
                                    };
                                };
                            };
                        };
                        $Infer: {
                            body: ({
                                permission: {
                                    readonly user?: ("create" | "update" | "delete" | "set-role" | "get" | "list" | "ban" | "impersonate" | "set-password")[] | undefined;
                                    readonly session?: ("delete" | "list" | "revoke")[] | undefined;
                                };
                                permissions?: never | undefined;
                            } | {
                                permissions: {
                                    readonly user?: ("create" | "update" | "delete" | "set-role" | "get" | "list" | "ban" | "impersonate" | "set-password")[] | undefined;
                                    readonly session?: ("delete" | "list" | "revoke")[] | undefined;
                                };
                                permission?: never | undefined;
                            }) & {
                                userId?: string | undefined;
                                role?: "user" | "admin" | undefined;
                            };
                        };
                    };
                }, {
                    error: null;
                    success: boolean;
                }>;
            };
            $ERROR_CODES: {
                readonly FAILED_TO_CREATE_USER: "Failed to create user";
                readonly USER_ALREADY_EXISTS: "User already exists.";
                readonly USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "User already exists. Use another email.";
                readonly YOU_CANNOT_BAN_YOURSELF: "You cannot ban yourself";
                readonly YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE: "You are not allowed to change users role";
                readonly YOU_ARE_NOT_ALLOWED_TO_CREATE_USERS: "You are not allowed to create users";
                readonly YOU_ARE_NOT_ALLOWED_TO_LIST_USERS: "You are not allowed to list users";
                readonly YOU_ARE_NOT_ALLOWED_TO_LIST_USERS_SESSIONS: "You are not allowed to list users sessions";
                readonly YOU_ARE_NOT_ALLOWED_TO_BAN_USERS: "You are not allowed to ban users";
                readonly YOU_ARE_NOT_ALLOWED_TO_IMPERSONATE_USERS: "You are not allowed to impersonate users";
                readonly YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS: "You are not allowed to revoke users sessions";
                readonly YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS: "You are not allowed to delete users";
                readonly YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD: "You are not allowed to set users password";
                readonly BANNED_USER: "You have been banned from this application";
                readonly YOU_ARE_NOT_ALLOWED_TO_GET_USER: "You are not allowed to get user";
                readonly NO_DATA_TO_UPDATE: "No data to update";
                readonly YOU_ARE_NOT_ALLOWED_TO_UPDATE_USERS: "You are not allowed to update users";
                readonly YOU_CANNOT_REMOVE_YOURSELF: "You cannot remove yourself";
                readonly YOU_ARE_NOT_ALLOWED_TO_SET_NON_EXISTENT_VALUE: "You are not allowed to set a non-existent role value";
                readonly YOU_CANNOT_IMPERSONATE_ADMINS: "You cannot impersonate admins";
                readonly INVALID_ROLE_TYPE: "Invalid role type";
            };
            schema: {
                user: {
                    fields: {
                        role: {
                            type: "string";
                            required: false;
                            input: false;
                        };
                        banned: {
                            type: "boolean";
                            defaultValue: false;
                            required: false;
                            input: false;
                        };
                        banReason: {
                            type: "string";
                            required: false;
                            input: false;
                        };
                        banExpires: {
                            type: "date";
                            required: false;
                            input: false;
                        };
                    };
                };
                session: {
                    fields: {
                        impersonatedBy: {
                            type: "string";
                            required: false;
                        };
                    };
                };
            };
            options: NoInfer<import("better-auth/plugins").AdminOptions>;
        }, {
            id: "api-key";
            $ERROR_CODES: {
                readonly INVALID_METADATA_TYPE: "metadata must be an object or undefined";
                readonly REFILL_AMOUNT_AND_INTERVAL_REQUIRED: "refillAmount is required when refillInterval is provided";
                readonly REFILL_INTERVAL_AND_AMOUNT_REQUIRED: "refillInterval is required when refillAmount is provided";
                readonly USER_BANNED: "User is banned";
                readonly UNAUTHORIZED_SESSION: "Unauthorized or invalid session";
                readonly KEY_NOT_FOUND: "API Key not found";
                readonly KEY_DISABLED: "API Key is disabled";
                readonly KEY_EXPIRED: "API Key has expired";
                readonly USAGE_EXCEEDED: "API Key has reached its usage limit";
                readonly KEY_NOT_RECOVERABLE: "API Key is not recoverable";
                readonly EXPIRES_IN_IS_TOO_SMALL: "The expiresIn is smaller than the predefined minimum value.";
                readonly EXPIRES_IN_IS_TOO_LARGE: "The expiresIn is larger than the predefined maximum value.";
                readonly INVALID_REMAINING: "The remaining count is either too large or too small.";
                readonly INVALID_PREFIX_LENGTH: "The prefix length is either too large or too small.";
                readonly INVALID_NAME_LENGTH: "The name length is either too large or too small.";
                readonly METADATA_DISABLED: "Metadata is disabled.";
                readonly RATE_LIMIT_EXCEEDED: "Rate limit exceeded.";
                readonly NO_VALUES_TO_UPDATE: "No values to update.";
                readonly KEY_DISABLED_EXPIRATION: "Custom key expiration values are disabled.";
                readonly INVALID_API_KEY: "Invalid API key.";
                readonly INVALID_USER_ID_FROM_API_KEY: "The user id from the API key is invalid.";
                readonly INVALID_API_KEY_GETTER_RETURN_TYPE: "API Key getter returned an invalid key type. Expected string.";
                readonly SERVER_ONLY_PROPERTY: "The property you're trying to set can only be set from the server auth instance only.";
                readonly FAILED_TO_UPDATE_API_KEY: "Failed to update API key";
                readonly NAME_REQUIRED: "API Key name is required.";
            };
            hooks: {
                before: {
                    matcher: (ctx: import("better-auth").HookEndpointContext) => boolean;
                    handler: (inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        user: {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                        session: {
                            id: string;
                            token: string;
                            userId: string;
                            userAgent: string | null;
                            ipAddress: string | null;
                            createdAt: Date;
                            updatedAt: Date;
                            expiresAt: Date;
                        };
                    } | {
                        context: import("better-auth").MiddlewareContext<import("better-auth").MiddlewareOptions, {
                            returned?: unknown | undefined;
                            responseHeaders?: Headers | undefined;
                        } & import("better-auth").PluginContext & import("better-auth").InfoContext & {
                            options: import("better-auth").BetterAuthOptions;
                            appName: string;
                            baseURL: string;
                            trustedOrigins: string[];
                            isTrustedOrigin: (url: string, settings?: {
                                allowRelativePaths: boolean;
                            }) => boolean;
                            oauthConfig: {
                                skipStateCookieCheck?: boolean | undefined;
                                storeStateStrategy: "database" | "cookie";
                            };
                            newSession: {
                                session: import("better-auth").Session & Record<string, any>;
                                user: import("better-auth").User & Record<string, any>;
                            } | null;
                            session: {
                                session: import("better-auth").Session & Record<string, any>;
                                user: import("better-auth").User & Record<string, any>;
                            } | null;
                            setNewSession: (session: {
                                session: import("better-auth").Session & Record<string, any>;
                                user: import("better-auth").User & Record<string, any>;
                            } | null) => void;
                            socialProviders: import("better-auth").OAuthProvider[];
                            authCookies: import("better-auth").BetterAuthCookies;
                            logger: ReturnType<(options?: import("better-auth").Logger | undefined) => import("better-auth").InternalLogger>;
                            rateLimit: {
                                enabled: boolean;
                                window: number;
                                max: number;
                                storage: "memory" | "database" | "secondary-storage";
                            } & Omit<import("better-auth").BetterAuthRateLimitOptions, "enabled" | "window" | "max" | "storage">;
                            adapter: import("better-auth").DBAdapter<import("better-auth").BetterAuthOptions>;
                            internalAdapter: import("better-auth").InternalAdapter<import("better-auth").BetterAuthOptions>;
                            createAuthCookie: (cookieName: string, overrideAttributes?: Partial<import("better-auth").CookieOptions> | undefined) => import("better-auth").BetterAuthCookie;
                            secret: string;
                            sessionConfig: {
                                updateAge: number;
                                expiresIn: number;
                                freshAge: number;
                                cookieRefreshCache: false | {
                                    enabled: true;
                                    updateAge: number;
                                };
                            };
                            generateId: (options: {
                                model: import("better-auth").ModelNames;
                                size?: number | undefined;
                            }) => string | false;
                            secondaryStorage: import("better-auth").SecondaryStorage | undefined;
                            password: {
                                hash: (password: string) => Promise<string>;
                                verify: (data: {
                                    password: string;
                                    hash: string;
                                }) => Promise<boolean>;
                                config: {
                                    minPasswordLength: number;
                                    maxPasswordLength: number;
                                };
                                checkPassword: (userId: string, ctx: import("better-auth").GenericEndpointContext<import("better-auth").BetterAuthOptions>) => Promise<boolean>;
                            };
                            tables: import("better-auth").BetterAuthDBSchema;
                            runMigrations: () => Promise<void>;
                            publishTelemetry: (event: {
                                type: string;
                                anonymousId?: string | undefined;
                                payload: Record<string, any>;
                            }) => Promise<void>;
                            skipOriginCheck: boolean | string[];
                            skipCSRFCheck: boolean;
                            runInBackground: (promise: Promise<unknown>) => void;
                            runInBackgroundOrAwait: (promise: Promise<unknown> | void) => import("better-auth").Awaitable<unknown>;
                        }>;
                    }>;
                }[];
            };
            endpoints: {
                createApiKey: import("better-auth").StrictEndpoint<"/api-key/create", {
                    method: "POST";
                    body: import("zod").ZodObject<{
                        name: import("zod").ZodOptional<import("zod").ZodString>;
                        expiresIn: import("zod").ZodDefault<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodNumber>>>;
                        userId: import("zod").ZodOptional<import("zod").ZodCoercedString<unknown>>;
                        prefix: import("zod").ZodOptional<import("zod").ZodString>;
                        remaining: import("zod").ZodDefault<import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodNumber>>>;
                        metadata: import("zod").ZodOptional<import("zod").ZodAny>;
                        refillAmount: import("zod").ZodOptional<import("zod").ZodNumber>;
                        refillInterval: import("zod").ZodOptional<import("zod").ZodNumber>;
                        rateLimitTimeWindow: import("zod").ZodOptional<import("zod").ZodNumber>;
                        rateLimitMax: import("zod").ZodOptional<import("zod").ZodNumber>;
                        rateLimitEnabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
                        permissions: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>>>;
                    }, import("better-auth").$strip>;
                    metadata: {
                        openapi: {
                            description: string;
                            responses: {
                                "200": {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    id: {
                                                        type: string;
                                                        description: string;
                                                    };
                                                    createdAt: {
                                                        type: string;
                                                        format: string;
                                                        description: string;
                                                    };
                                                    updatedAt: {
                                                        type: string;
                                                        format: string;
                                                        description: string;
                                                    };
                                                    name: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    prefix: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    start: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    key: {
                                                        type: string;
                                                        description: string;
                                                    };
                                                    enabled: {
                                                        type: string;
                                                        description: string;
                                                    };
                                                    expiresAt: {
                                                        type: string;
                                                        format: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    userId: {
                                                        type: string;
                                                        description: string;
                                                    };
                                                    lastRefillAt: {
                                                        type: string;
                                                        format: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    lastRequest: {
                                                        type: string;
                                                        format: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    metadata: {
                                                        type: string;
                                                        nullable: boolean;
                                                        additionalProperties: boolean;
                                                        description: string;
                                                    };
                                                    rateLimitMax: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    rateLimitTimeWindow: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    remaining: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    refillAmount: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    refillInterval: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    rateLimitEnabled: {
                                                        type: string;
                                                        description: string;
                                                    };
                                                    requestCount: {
                                                        type: string;
                                                        description: string;
                                                    };
                                                    permissions: {
                                                        type: string;
                                                        nullable: boolean;
                                                        additionalProperties: {
                                                            type: string;
                                                            items: {
                                                                type: string;
                                                            };
                                                        };
                                                        description: string;
                                                    };
                                                };
                                                required: string[];
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                }, {
                    key: string;
                    metadata: any;
                    permissions: any;
                    id: string;
                    name: string | null;
                    start: string | null;
                    prefix: string | null;
                    userId: string;
                    refillInterval: number | null;
                    refillAmount: number | null;
                    lastRefillAt: Date | null;
                    enabled: boolean;
                    rateLimitEnabled: boolean;
                    rateLimitTimeWindow: number | null;
                    rateLimitMax: number | null;
                    requestCount: number;
                    remaining: number | null;
                    lastRequest: Date | null;
                    expiresAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                }>;
                verifyApiKey: import("better-auth").StrictEndpoint<string, {
                    method: "POST";
                    body: import("zod").ZodObject<{
                        key: import("zod").ZodString;
                        permissions: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>>>;
                    }, import("better-auth").$strip>;
                }, {
                    valid: boolean;
                    error: {
                        message: string | undefined;
                        code: string;
                    };
                    key: null;
                } | {
                    valid: boolean;
                    error: null;
                    key: Omit<import("better-auth/plugins").ApiKey, "key"> | null;
                }>;
                getApiKey: import("better-auth").StrictEndpoint<"/api-key/get", {
                    method: "GET";
                    query: import("zod").ZodObject<{
                        id: import("zod").ZodString;
                    }, import("better-auth").$strip>;
                    use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        session: {
                            session: Record<string, any> & {
                                id: string;
                                createdAt: Date;
                                updatedAt: Date;
                                userId: string;
                                expiresAt: Date;
                                token: string;
                                ipAddress?: string | null | undefined;
                                userAgent?: string | null | undefined;
                            };
                            user: Record<string, any> & {
                                id: string;
                                createdAt: Date;
                                updatedAt: Date;
                                email: string;
                                emailVerified: boolean;
                                name: string;
                                image?: string | null | undefined;
                            };
                        };
                    }>)[];
                    metadata: {
                        openapi: {
                            description: string;
                            responses: {
                                "200": {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    id: {
                                                        type: string;
                                                        description: string;
                                                    };
                                                    name: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    start: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    prefix: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    userId: {
                                                        type: string;
                                                        description: string;
                                                    };
                                                    refillInterval: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    refillAmount: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    lastRefillAt: {
                                                        type: string;
                                                        format: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    enabled: {
                                                        type: string;
                                                        description: string;
                                                        default: boolean;
                                                    };
                                                    rateLimitEnabled: {
                                                        type: string;
                                                        description: string;
                                                    };
                                                    rateLimitTimeWindow: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    rateLimitMax: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    requestCount: {
                                                        type: string;
                                                        description: string;
                                                    };
                                                    remaining: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    lastRequest: {
                                                        type: string;
                                                        format: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    expiresAt: {
                                                        type: string;
                                                        format: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    createdAt: {
                                                        type: string;
                                                        format: string;
                                                        description: string;
                                                    };
                                                    updatedAt: {
                                                        type: string;
                                                        format: string;
                                                        description: string;
                                                    };
                                                    metadata: {
                                                        type: string;
                                                        nullable: boolean;
                                                        additionalProperties: boolean;
                                                        description: string;
                                                    };
                                                    permissions: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                };
                                                required: string[];
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                }, {
                    metadata: Record<string, any> | null;
                    permissions: {
                        [key: string]: string[];
                    } | null;
                    id: string;
                    name: string | null;
                    start: string | null;
                    prefix: string | null;
                    userId: string;
                    refillInterval: number | null;
                    refillAmount: number | null;
                    lastRefillAt: Date | null;
                    enabled: boolean;
                    rateLimitEnabled: boolean;
                    rateLimitTimeWindow: number | null;
                    rateLimitMax: number | null;
                    requestCount: number;
                    remaining: number | null;
                    lastRequest: Date | null;
                    expiresAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                }>;
                updateApiKey: import("better-auth").StrictEndpoint<"/api-key/update", {
                    method: "POST";
                    body: import("zod").ZodObject<{
                        keyId: import("zod").ZodString;
                        userId: import("zod").ZodOptional<import("zod").ZodCoercedString<unknown>>;
                        name: import("zod").ZodOptional<import("zod").ZodString>;
                        enabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
                        remaining: import("zod").ZodOptional<import("zod").ZodNumber>;
                        refillAmount: import("zod").ZodOptional<import("zod").ZodNumber>;
                        refillInterval: import("zod").ZodOptional<import("zod").ZodNumber>;
                        metadata: import("zod").ZodOptional<import("zod").ZodAny>;
                        expiresIn: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodNumber>>;
                        rateLimitEnabled: import("zod").ZodOptional<import("zod").ZodBoolean>;
                        rateLimitTimeWindow: import("zod").ZodOptional<import("zod").ZodNumber>;
                        rateLimitMax: import("zod").ZodOptional<import("zod").ZodNumber>;
                        permissions: import("zod").ZodNullable<import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>>>>;
                    }, import("better-auth").$strip>;
                    metadata: {
                        openapi: {
                            description: string;
                            responses: {
                                "200": {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    id: {
                                                        type: string;
                                                        description: string;
                                                    };
                                                    name: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    start: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    prefix: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    userId: {
                                                        type: string;
                                                        description: string;
                                                    };
                                                    refillInterval: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    refillAmount: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    lastRefillAt: {
                                                        type: string;
                                                        format: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    enabled: {
                                                        type: string;
                                                        description: string;
                                                        default: boolean;
                                                    };
                                                    rateLimitEnabled: {
                                                        type: string;
                                                        description: string;
                                                    };
                                                    rateLimitTimeWindow: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    rateLimitMax: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    requestCount: {
                                                        type: string;
                                                        description: string;
                                                    };
                                                    remaining: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    lastRequest: {
                                                        type: string;
                                                        format: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    expiresAt: {
                                                        type: string;
                                                        format: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                    createdAt: {
                                                        type: string;
                                                        format: string;
                                                        description: string;
                                                    };
                                                    updatedAt: {
                                                        type: string;
                                                        format: string;
                                                        description: string;
                                                    };
                                                    metadata: {
                                                        type: string;
                                                        nullable: boolean;
                                                        additionalProperties: boolean;
                                                        description: string;
                                                    };
                                                    permissions: {
                                                        type: string;
                                                        nullable: boolean;
                                                        description: string;
                                                    };
                                                };
                                                required: string[];
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                }, {
                    metadata: Record<string, any> | null;
                    permissions: {
                        [key: string]: string[];
                    } | null;
                    id: string;
                    name: string | null;
                    start: string | null;
                    prefix: string | null;
                    userId: string;
                    refillInterval: number | null;
                    refillAmount: number | null;
                    lastRefillAt: Date | null;
                    enabled: boolean;
                    rateLimitEnabled: boolean;
                    rateLimitTimeWindow: number | null;
                    rateLimitMax: number | null;
                    requestCount: number;
                    remaining: number | null;
                    lastRequest: Date | null;
                    expiresAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                }>;
                deleteApiKey: import("better-auth").StrictEndpoint<"/api-key/delete", {
                    method: "POST";
                    body: import("zod").ZodObject<{
                        keyId: import("zod").ZodString;
                    }, import("better-auth").$strip>;
                    use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        session: {
                            session: Record<string, any> & {
                                id: string;
                                createdAt: Date;
                                updatedAt: Date;
                                userId: string;
                                expiresAt: Date;
                                token: string;
                                ipAddress?: string | null | undefined;
                                userAgent?: string | null | undefined;
                            };
                            user: Record<string, any> & {
                                id: string;
                                createdAt: Date;
                                updatedAt: Date;
                                email: string;
                                emailVerified: boolean;
                                name: string;
                                image?: string | null | undefined;
                            };
                        };
                    }>)[];
                    metadata: {
                        openapi: {
                            description: string;
                            requestBody: {
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                keyId: {
                                                    type: string;
                                                    description: string;
                                                };
                                            };
                                            required: string[];
                                        };
                                    };
                                };
                            };
                            responses: {
                                "200": {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object";
                                                properties: {
                                                    success: {
                                                        type: string;
                                                        description: string;
                                                    };
                                                };
                                                required: string[];
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                }, {
                    success: boolean;
                }>;
                listApiKeys: import("better-auth").StrictEndpoint<"/api-key/list", {
                    method: "GET";
                    use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        session: {
                            session: Record<string, any> & {
                                id: string;
                                createdAt: Date;
                                updatedAt: Date;
                                userId: string;
                                expiresAt: Date;
                                token: string;
                                ipAddress?: string | null | undefined;
                                userAgent?: string | null | undefined;
                            };
                            user: Record<string, any> & {
                                id: string;
                                createdAt: Date;
                                updatedAt: Date;
                                email: string;
                                emailVerified: boolean;
                                name: string;
                                image?: string | null | undefined;
                            };
                        };
                    }>)[];
                    metadata: {
                        openapi: {
                            description: string;
                            responses: {
                                "200": {
                                    description: string;
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "array";
                                                items: {
                                                    type: string;
                                                    properties: {
                                                        id: {
                                                            type: string;
                                                            description: string;
                                                        };
                                                        name: {
                                                            type: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        start: {
                                                            type: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        prefix: {
                                                            type: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        userId: {
                                                            type: string;
                                                            description: string;
                                                        };
                                                        refillInterval: {
                                                            type: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        refillAmount: {
                                                            type: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        lastRefillAt: {
                                                            type: string;
                                                            format: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        enabled: {
                                                            type: string;
                                                            description: string;
                                                            default: boolean;
                                                        };
                                                        rateLimitEnabled: {
                                                            type: string;
                                                            description: string;
                                                        };
                                                        rateLimitTimeWindow: {
                                                            type: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        rateLimitMax: {
                                                            type: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        requestCount: {
                                                            type: string;
                                                            description: string;
                                                        };
                                                        remaining: {
                                                            type: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        lastRequest: {
                                                            type: string;
                                                            format: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        expiresAt: {
                                                            type: string;
                                                            format: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        createdAt: {
                                                            type: string;
                                                            format: string;
                                                            description: string;
                                                        };
                                                        updatedAt: {
                                                            type: string;
                                                            format: string;
                                                            description: string;
                                                        };
                                                        metadata: {
                                                            type: string;
                                                            nullable: boolean;
                                                            additionalProperties: boolean;
                                                            description: string;
                                                        };
                                                        permissions: {
                                                            type: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                    };
                                                    required: string[];
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                }, {
                    metadata: Record<string, any> | null;
                    permissions: {
                        [key: string]: string[];
                    } | null;
                    id: string;
                    name: string | null;
                    start: string | null;
                    prefix: string | null;
                    userId: string;
                    refillInterval: number | null;
                    refillAmount: number | null;
                    lastRefillAt: Date | null;
                    enabled: boolean;
                    rateLimitEnabled: boolean;
                    rateLimitTimeWindow: number | null;
                    rateLimitMax: number | null;
                    requestCount: number;
                    remaining: number | null;
                    lastRequest: Date | null;
                    expiresAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                }[]>;
                deleteAllExpiredApiKeys: import("better-auth").StrictEndpoint<string, {
                    method: "POST";
                }, {
                    success: boolean;
                    error: unknown;
                }>;
            };
            schema: {
                apikey: {
                    fields: {
                        name: {
                            type: "string";
                            required: false;
                            input: false;
                        };
                        start: {
                            type: "string";
                            required: false;
                            input: false;
                        };
                        prefix: {
                            type: "string";
                            required: false;
                            input: false;
                        };
                        key: {
                            type: "string";
                            required: true;
                            input: false;
                            index: true;
                        };
                        userId: {
                            type: "string";
                            references: {
                                model: string;
                                field: string;
                                onDelete: "cascade";
                            };
                            required: true;
                            input: false;
                            index: true;
                        };
                        refillInterval: {
                            type: "number";
                            required: false;
                            input: false;
                        };
                        refillAmount: {
                            type: "number";
                            required: false;
                            input: false;
                        };
                        lastRefillAt: {
                            type: "date";
                            required: false;
                            input: false;
                        };
                        enabled: {
                            type: "boolean";
                            required: false;
                            input: false;
                            defaultValue: true;
                        };
                        rateLimitEnabled: {
                            type: "boolean";
                            required: false;
                            input: false;
                            defaultValue: true;
                        };
                        rateLimitTimeWindow: {
                            type: "number";
                            required: false;
                            input: false;
                            defaultValue: number;
                        };
                        rateLimitMax: {
                            type: "number";
                            required: false;
                            input: false;
                            defaultValue: number;
                        };
                        requestCount: {
                            type: "number";
                            required: false;
                            input: false;
                            defaultValue: number;
                        };
                        remaining: {
                            type: "number";
                            required: false;
                            input: false;
                        };
                        lastRequest: {
                            type: "date";
                            required: false;
                            input: false;
                        };
                        expiresAt: {
                            type: "date";
                            required: false;
                            input: false;
                        };
                        createdAt: {
                            type: "date";
                            required: true;
                            input: false;
                        };
                        updatedAt: {
                            type: "date";
                            required: true;
                            input: false;
                        };
                        permissions: {
                            type: "string";
                            required: false;
                            input: false;
                        };
                        metadata: {
                            type: "string";
                            required: false;
                            input: true;
                            transform: {
                                input(value: import("better-auth").DBPrimitive): string;
                                output(value: import("better-auth").DBPrimitive): any;
                            };
                        };
                    };
                };
            };
            options: import("better-auth/plugins").ApiKeyOptions | undefined;
        }, {
            id: "bearer";
            hooks: {
                before: {
                    matcher(context: import("better-auth").HookEndpointContext): boolean;
                    handler: (inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                        context: {
                            headers: Headers;
                        };
                    } | undefined>;
                }[];
                after: {
                    matcher(context: import("better-auth").HookEndpointContext): true;
                    handler: (inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<void>;
                }[];
            };
            options: import("better-auth/plugins").BearerOptions | undefined;
        }];
        emailAndPassword: {
            enabled: true;
            requireEmailVerification: true;
        };
    };
    defaultAccess: {
        read: ({ session }: any) => boolean;
        create: ({ session }: any) => boolean;
        update: ({ session }: any) => boolean;
        delete: ({ session }: any) => boolean;
    };
    fields: {
        readonly text: {
            readonly type: "text";
            readonly _value: string;
            readonly toColumn: (name: string, config: import("../../..").TextFieldConfig) => any;
            readonly toZodSchema: (config: import("../../..").TextFieldConfig) => import("zod").ZodString | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            readonly getOperators: <TApp>(config: import("../../..").TextFieldConfig) => {
                column: {
                    readonly eq: import("../../..").OperatorFn<string, unknown>;
                    readonly ne: import("../../..").OperatorFn<string, unknown>;
                    readonly in: import("../../..").OperatorFn<string[], unknown>;
                    readonly notIn: import("../../..").OperatorFn<string[], unknown>;
                    readonly like: import("../../..").OperatorFn<string, unknown>;
                    readonly ilike: import("../../..").OperatorFn<string, unknown>;
                    readonly notLike: import("../../..").OperatorFn<string, unknown>;
                    readonly notIlike: import("../../..").OperatorFn<string, unknown>;
                    readonly contains: import("../../..").OperatorFn<string, unknown>;
                    readonly startsWith: import("../../..").OperatorFn<string, unknown>;
                    readonly endsWith: import("../../..").OperatorFn<string, unknown>;
                    readonly isNull: import("../../..").OperatorFn<boolean, unknown>;
                    readonly isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
                jsonb: {
                    readonly eq: import("../../..").OperatorFn<string, unknown>;
                    readonly ne: import("../../..").OperatorFn<string, unknown>;
                    readonly in: import("../../..").OperatorFn<string[], unknown>;
                    readonly notIn: import("../../..").OperatorFn<string[], unknown>;
                    readonly like: import("../../..").OperatorFn<string, unknown>;
                    readonly ilike: import("../../..").OperatorFn<string, unknown>;
                    readonly contains: import("../../..").OperatorFn<string, unknown>;
                    readonly startsWith: import("../../..").OperatorFn<string, unknown>;
                    readonly endsWith: import("../../..").OperatorFn<string, unknown>;
                    readonly isNull: import("../../..").OperatorFn<boolean, unknown>;
                    readonly isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
            };
            readonly getMetadata: (config: import("../../..").TextFieldConfig) => import("../../..").FieldMetadataBase;
        };
        readonly textarea: {
            readonly type: "textarea";
            readonly _value: string;
            readonly toColumn: (name: string, config: import("../../..").TextareaFieldConfig) => any;
            readonly toZodSchema: (config: import("../../..").TextareaFieldConfig) => import("zod").ZodString | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            readonly getOperators: <TApp>(config: import("../../..").TextareaFieldConfig) => {
                column: {
                    isEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNotEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    eq: import("../../..").OperatorFn<string, unknown>;
                    ne: import("../../..").OperatorFn<string, unknown>;
                    in: import("../../..").OperatorFn<string[], unknown>;
                    notIn: import("../../..").OperatorFn<string[], unknown>;
                    like: import("../../..").OperatorFn<string, unknown>;
                    ilike: import("../../..").OperatorFn<string, unknown>;
                    notLike: import("../../..").OperatorFn<string, unknown>;
                    notIlike: import("../../..").OperatorFn<string, unknown>;
                    contains: import("../../..").OperatorFn<string, unknown>;
                    startsWith: import("../../..").OperatorFn<string, unknown>;
                    endsWith: import("../../..").OperatorFn<string, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
                jsonb: {
                    isEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNotEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    eq: import("../../..").OperatorFn<string, unknown>;
                    ne: import("../../..").OperatorFn<string, unknown>;
                    in: import("../../..").OperatorFn<string[], unknown>;
                    notIn: import("../../..").OperatorFn<string[], unknown>;
                    like: import("../../..").OperatorFn<string, unknown>;
                    ilike: import("../../..").OperatorFn<string, unknown>;
                    contains: import("../../..").OperatorFn<string, unknown>;
                    startsWith: import("../../..").OperatorFn<string, unknown>;
                    endsWith: import("../../..").OperatorFn<string, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
            };
            readonly getMetadata: (config: import("../../..").TextareaFieldConfig) => import("../../..").FieldMetadataBase;
        };
        readonly email: {
            readonly type: "email";
            readonly _value: string;
            readonly toColumn: (name: string, config: import("../../..").EmailFieldConfig) => any;
            readonly toZodSchema: (config: import("../../..").EmailFieldConfig) => import("zod").ZodString | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            readonly getOperators: <TApp>(config: import("../../..").EmailFieldConfig) => {
                column: {
                    in: import("../../..").OperatorFn<string[], unknown>;
                    domain: import("../../..").OperatorFn<string, unknown>;
                    domainIn: import("../../..").OperatorFn<string[], unknown>;
                    eq: import("../../..").OperatorFn<string, unknown>;
                    ne: import("../../..").OperatorFn<string, unknown>;
                    notIn: import("../../..").OperatorFn<string[], unknown>;
                    like: import("../../..").OperatorFn<string, unknown>;
                    ilike: import("../../..").OperatorFn<string, unknown>;
                    notLike: import("../../..").OperatorFn<string, unknown>;
                    notIlike: import("../../..").OperatorFn<string, unknown>;
                    contains: import("../../..").OperatorFn<string, unknown>;
                    startsWith: import("../../..").OperatorFn<string, unknown>;
                    endsWith: import("../../..").OperatorFn<string, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
                jsonb: {
                    domain: import("../../..").OperatorFn<string, unknown>;
                    eq: import("../../..").OperatorFn<string, unknown>;
                    ne: import("../../..").OperatorFn<string, unknown>;
                    in: import("../../..").OperatorFn<string[], unknown>;
                    notIn: import("../../..").OperatorFn<string[], unknown>;
                    like: import("../../..").OperatorFn<string, unknown>;
                    ilike: import("../../..").OperatorFn<string, unknown>;
                    contains: import("../../..").OperatorFn<string, unknown>;
                    startsWith: import("../../..").OperatorFn<string, unknown>;
                    endsWith: import("../../..").OperatorFn<string, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
            };
            readonly getMetadata: (config: import("../../..").EmailFieldConfig) => import("../../..").FieldMetadataBase;
        };
        readonly url: {
            readonly type: "url";
            readonly _value: string;
            readonly toColumn: (name: string, config: import("../../..").UrlFieldConfig) => any;
            readonly toZodSchema: (config: import("../../..").UrlFieldConfig) => import("zod").ZodString | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            readonly getOperators: <TApp>(config: import("../../..").UrlFieldConfig) => {
                column: {
                    host: import("../../..").OperatorFn<string, unknown>;
                    hostIn: import("../../..").OperatorFn<string[], unknown>;
                    protocol: import("../../..").OperatorFn<string, unknown>;
                    eq: import("../../..").OperatorFn<string, unknown>;
                    ne: import("../../..").OperatorFn<string, unknown>;
                    in: import("../../..").OperatorFn<string[], unknown>;
                    notIn: import("../../..").OperatorFn<string[], unknown>;
                    like: import("../../..").OperatorFn<string, unknown>;
                    ilike: import("../../..").OperatorFn<string, unknown>;
                    notLike: import("../../..").OperatorFn<string, unknown>;
                    notIlike: import("../../..").OperatorFn<string, unknown>;
                    contains: import("../../..").OperatorFn<string, unknown>;
                    startsWith: import("../../..").OperatorFn<string, unknown>;
                    endsWith: import("../../..").OperatorFn<string, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
                jsonb: {
                    host: import("../../..").OperatorFn<string, unknown>;
                    protocol: import("../../..").OperatorFn<string, unknown>;
                    eq: import("../../..").OperatorFn<string, unknown>;
                    ne: import("../../..").OperatorFn<string, unknown>;
                    in: import("../../..").OperatorFn<string[], unknown>;
                    notIn: import("../../..").OperatorFn<string[], unknown>;
                    like: import("../../..").OperatorFn<string, unknown>;
                    ilike: import("../../..").OperatorFn<string, unknown>;
                    contains: import("../../..").OperatorFn<string, unknown>;
                    startsWith: import("../../..").OperatorFn<string, unknown>;
                    endsWith: import("../../..").OperatorFn<string, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
            };
            readonly getMetadata: (config: import("../../..").UrlFieldConfig) => import("../../..").FieldMetadataBase;
        };
        readonly number: {
            readonly type: "number";
            readonly _value: number;
            readonly toColumn: (name: string, config: import("../../..").NumberFieldConfig) => any;
            readonly toZodSchema: (config: import("../../..").NumberFieldConfig) => import("zod").ZodNumber | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodNumber>>;
            readonly getOperators: <TApp>(config: import("../../..").NumberFieldConfig) => {
                column: {
                    eq: import("../../..").OperatorFn<number, unknown>;
                    ne: import("../../..").OperatorFn<number, unknown>;
                    gt: import("../../..").OperatorFn<number, unknown>;
                    gte: import("../../..").OperatorFn<number, unknown>;
                    lt: import("../../..").OperatorFn<number, unknown>;
                    lte: import("../../..").OperatorFn<number, unknown>;
                    between: import("../../..").OperatorFn<[number, number], unknown>;
                    in: import("../../..").OperatorFn<number[], unknown>;
                    notIn: import("../../..").OperatorFn<number[], unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
                jsonb: {
                    eq: import("../../..").OperatorFn<number, unknown>;
                    ne: import("../../..").OperatorFn<number, unknown>;
                    gt: import("../../..").OperatorFn<number, unknown>;
                    gte: import("../../..").OperatorFn<number, unknown>;
                    lt: import("../../..").OperatorFn<number, unknown>;
                    lte: import("../../..").OperatorFn<number, unknown>;
                    between: import("../../..").OperatorFn<[number, number], unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
            };
            readonly getMetadata: (config: import("../../..").NumberFieldConfig) => import("../../..").FieldMetadataBase & {
                mode?: string;
                integer?: boolean;
                step?: number;
            };
        };
        readonly boolean: {
            readonly type: "boolean";
            readonly _value: boolean;
            readonly toColumn: (name: string, config: import("../../..").BooleanFieldConfig) => any;
            readonly toZodSchema: (config: import("../../..").BooleanFieldConfig) => import("zod").ZodBoolean | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodBoolean>>;
            readonly getOperators: <TApp>(config: import("../../..").BooleanFieldConfig) => {
                column: {
                    eq: import("../../..").OperatorFn<boolean, unknown>;
                    ne: import("../../..").OperatorFn<boolean, unknown>;
                    is: import("../../..").OperatorFn<boolean, unknown>;
                    isNot: import("../../..").OperatorFn<boolean, unknown>;
                    isTrue: import("../../..").OperatorFn<boolean, unknown>;
                    isFalse: import("../../..").OperatorFn<boolean, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
                jsonb: {
                    eq: import("../../..").OperatorFn<boolean, unknown>;
                    ne: import("../../..").OperatorFn<boolean, unknown>;
                    is: import("../../..").OperatorFn<boolean, unknown>;
                    isNot: import("../../..").OperatorFn<boolean, unknown>;
                    isTrue: import("../../..").OperatorFn<boolean, unknown>;
                    isFalse: import("../../..").OperatorFn<boolean, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
            };
            readonly getMetadata: (config: import("../../..").BooleanFieldConfig) => import("../../..").FieldMetadataBase;
        };
        readonly date: {
            readonly type: "date";
            readonly _value: string;
            readonly toColumn: (name: string, config: import("../../..").DateFieldConfig) => any;
            readonly toZodSchema: (config: import("../../..").DateFieldConfig) => import("zod").ZodString | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            readonly getOperators: <TApp>() => {
                column: {
                    eq: import("../../..").OperatorFn<string, unknown>;
                    ne: import("../../..").OperatorFn<string, unknown>;
                    gt: import("../../..").OperatorFn<string, unknown>;
                    gte: import("../../..").OperatorFn<string, unknown>;
                    lt: import("../../..").OperatorFn<string, unknown>;
                    lte: import("../../..").OperatorFn<string, unknown>;
                    between: import("../../..").OperatorFn<[string, string], unknown>;
                    before: import("../../..").OperatorFn<string, unknown>;
                    after: import("../../..").OperatorFn<string, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
                jsonb: {
                    eq: import("../../..").OperatorFn<string, unknown>;
                    ne: import("../../..").OperatorFn<string, unknown>;
                    gt: import("../../..").OperatorFn<string, unknown>;
                    gte: import("../../..").OperatorFn<string, unknown>;
                    lt: import("../../..").OperatorFn<string, unknown>;
                    lte: import("../../..").OperatorFn<string, unknown>;
                    between: import("../../..").OperatorFn<[string, string], unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
            };
            readonly getMetadata: (config: import("../../..").DateFieldConfig) => import("../../..").FieldMetadataBase & {
                min?: string;
                max?: string;
            };
        };
        readonly datetime: {
            readonly type: "datetime";
            readonly _value: Date;
            readonly toColumn: (name: string, config: import("../../..").DatetimeFieldConfig) => any;
            readonly toZodSchema: (config: import("../../..").DatetimeFieldConfig) => import("zod").ZodCoercedDate<unknown> | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodCoercedDate<unknown>>>;
            readonly getOperators: <TApp>() => {
                column: {
                    eq: import("../../..").OperatorFn<import("../../../../shared").DateInput, unknown>;
                    ne: import("../../..").OperatorFn<import("../../../../shared").DateInput, unknown>;
                    gt: import("../../..").OperatorFn<import("../../../../shared").DateInput, unknown>;
                    gte: import("../../..").OperatorFn<import("../../../../shared").DateInput, unknown>;
                    lt: import("../../..").OperatorFn<import("../../../../shared").DateInput, unknown>;
                    lte: import("../../..").OperatorFn<import("../../../../shared").DateInput, unknown>;
                    between: import("../../..").OperatorFn<[import("../../../../shared").DateInput, import("../../../../shared").DateInput], unknown>;
                    before: import("../../..").OperatorFn<import("../../../../shared").DateInput, unknown>;
                    after: import("../../..").OperatorFn<import("../../../../shared").DateInput, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
                jsonb: {
                    eq: import("../../..").OperatorFn<import("../../../../shared").DateInput, unknown>;
                    ne: import("../../..").OperatorFn<import("../../../../shared").DateInput, unknown>;
                    gt: import("../../..").OperatorFn<import("../../../../shared").DateInput, unknown>;
                    gte: import("../../..").OperatorFn<import("../../../../shared").DateInput, unknown>;
                    lt: import("../../..").OperatorFn<import("../../../../shared").DateInput, unknown>;
                    lte: import("../../..").OperatorFn<import("../../../../shared").DateInput, unknown>;
                    between: import("../../..").OperatorFn<[import("../../../../shared").DateInput, import("../../../../shared").DateInput], unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
            };
            readonly getMetadata: (config: import("../../..").DatetimeFieldConfig) => import("../../..").FieldMetadataBase & {
                min?: string;
                max?: string;
                precision?: number;
                withTimezone?: boolean;
            };
        };
        readonly time: {
            readonly type: "time";
            readonly _value: string;
            readonly toColumn: (name: string, config: import("../../..").TimeFieldConfig) => any;
            readonly toZodSchema: (config: import("../../..").TimeFieldConfig) => import("zod").ZodString | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>>;
            readonly getOperators: <TApp>() => {
                column: {
                    eq: import("../../..").OperatorFn<string, unknown>;
                    ne: import("../../..").OperatorFn<string, unknown>;
                    gt: import("../../..").OperatorFn<string, unknown>;
                    gte: import("../../..").OperatorFn<string, unknown>;
                    lt: import("../../..").OperatorFn<string, unknown>;
                    lte: import("../../..").OperatorFn<string, unknown>;
                    between: import("../../..").OperatorFn<[string, string], unknown>;
                    before: import("../../..").OperatorFn<string, unknown>;
                    after: import("../../..").OperatorFn<string, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
                jsonb: {
                    eq: import("../../..").OperatorFn<string, unknown>;
                    ne: import("../../..").OperatorFn<string, unknown>;
                    gt: import("../../..").OperatorFn<string, unknown>;
                    gte: import("../../..").OperatorFn<string, unknown>;
                    lt: import("../../..").OperatorFn<string, unknown>;
                    lte: import("../../..").OperatorFn<string, unknown>;
                    between: import("../../..").OperatorFn<[string, string], unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
            };
            readonly getMetadata: (config: import("../../..").TimeFieldConfig) => import("../../..").FieldMetadataBase & {
                min?: string;
                max?: string;
                withSeconds?: boolean;
                precision?: number;
            };
        };
        readonly select: {
            readonly type: "select";
            readonly _value: string | string[];
            readonly toColumn: (name: string, config: import("../../..").SelectFieldConfig) => any;
            readonly toZodSchema: (config: import("../../..").SelectFieldConfig) => import("zod").ZodString | import("zod").ZodArray<import("zod").ZodString> | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>> | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodArray<import("zod").ZodString>>> | import("zod").ZodEnum<{
                [x: string]: string;
            }> | import("zod").ZodArray<import("zod").ZodEnum<{
                [x: string]: string;
            }>> | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodArray<import("zod").ZodEnum<{
                [x: string]: string;
            }>>>> | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodEnum<{
                [x: string]: string;
            }>>>;
            readonly getOperators: <TApp>(config: import("../../..").SelectFieldConfig) => {
                column: {
                    containsAll: import("../../..").OperatorFn<string[], unknown>;
                    containsAny: import("../../..").OperatorFn<string[], unknown>;
                    eq: import("../../..").OperatorFn<string[], unknown>;
                    isEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNotEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    length: import("../../..").OperatorFn<number, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
                jsonb: {
                    containsAll: import("../../..").OperatorFn<string[], unknown>;
                    containsAny: import("../../..").OperatorFn<string[], unknown>;
                    eq: import("../../..").OperatorFn<string[], unknown>;
                    isEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNotEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    length: import("../../..").OperatorFn<number, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
            } | {
                column: {
                    eq: import("../../..").OperatorFn<string, unknown>;
                    ne: import("../../..").OperatorFn<string, unknown>;
                    in: import("../../..").OperatorFn<string[], unknown>;
                    notIn: import("../../..").OperatorFn<string[], unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
                jsonb: {
                    eq: import("../../..").OperatorFn<string, unknown>;
                    ne: import("../../..").OperatorFn<string, unknown>;
                    in: import("../../..").OperatorFn<string[], unknown>;
                    notIn: import("../../..").OperatorFn<string[], unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
            };
            readonly getMetadata: (config: import("../../..").SelectFieldConfig) => import("../../..").SelectFieldMetadata;
        };
        readonly upload: {
            readonly type: "upload";
            readonly _value: string | string[];
            readonly toColumn: (name: string, config: import("../../..").UploadFieldConfig) => any;
            readonly toZodSchema: (config: import("../../..").UploadFieldConfig) => import("zod").ZodString | import("zod").ZodArray<import("zod").ZodString> | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>> | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodArray<import("zod").ZodString>>>;
            readonly getOperators: <TApp>(config: import("../../..").UploadFieldConfig) => {
                column: {
                    readonly some: import("../../..").OperatorFn<boolean, unknown>;
                    readonly none: import("../../..").OperatorFn<boolean, unknown>;
                    readonly every: import("../../..").OperatorFn<boolean, unknown>;
                    readonly count: import("../../..").OperatorFn<number, unknown>;
                };
                jsonb: {
                    readonly some: import("../../..").OperatorFn<boolean, unknown>;
                    readonly none: import("../../..").OperatorFn<boolean, unknown>;
                    readonly every: import("../../..").OperatorFn<boolean, unknown>;
                    readonly count: import("../../..").OperatorFn<number, unknown>;
                };
            } | {
                column: {
                    readonly eq: import("../../..").OperatorFn<string, unknown>;
                    readonly ne: import("../../..").OperatorFn<string, unknown>;
                    readonly in: import("../../..").OperatorFn<string[], unknown>;
                    readonly notIn: import("../../..").OperatorFn<string[], unknown>;
                    readonly like: import("../../..").OperatorFn<string, unknown>;
                    readonly ilike: import("../../..").OperatorFn<string, unknown>;
                    readonly notLike: import("../../..").OperatorFn<string, unknown>;
                    readonly notIlike: import("../../..").OperatorFn<string, unknown>;
                    readonly contains: import("../../..").OperatorFn<string, unknown>;
                    readonly startsWith: import("../../..").OperatorFn<string, unknown>;
                    readonly endsWith: import("../../..").OperatorFn<string, unknown>;
                    readonly isNull: import("../../..").OperatorFn<boolean, unknown>;
                    readonly isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
                jsonb: {
                    readonly eq: import("../../..").OperatorFn<string, unknown>;
                    readonly ne: import("../../..").OperatorFn<string, unknown>;
                    readonly in: import("../../..").OperatorFn<string[], unknown>;
                    readonly notIn: import("../../..").OperatorFn<string[], unknown>;
                    readonly like: import("../../..").OperatorFn<string, unknown>;
                    readonly ilike: import("../../..").OperatorFn<string, unknown>;
                    readonly contains: import("../../..").OperatorFn<string, unknown>;
                    readonly startsWith: import("../../..").OperatorFn<string, unknown>;
                    readonly endsWith: import("../../..").OperatorFn<string, unknown>;
                    readonly isNull: import("../../..").OperatorFn<boolean, unknown>;
                    readonly isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
            };
            readonly getMetadata: (config: import("../../..").UploadFieldConfig) => import("../../..").RelationFieldMetadata;
        };
        readonly relation: {
            readonly type: "relation";
            readonly _value: string | string[] | {
                type: string;
                id: string;
            } | null;
            readonly toColumn: (name: string, config: import("../../..").RelationFieldConfig) => any;
            readonly toZodSchema: (config: import("../../..").RelationFieldConfig) => import("zod").ZodString | import("zod").ZodArray<import("zod").ZodString> | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodString>> | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodArray<import("zod").ZodString>>> | import("zod").ZodObject<{
                type: import("zod").ZodEnum<{
                    [x: string]: string;
                }>;
                id: import("zod").ZodString;
            }, import("better-auth").$strip> | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
                type: import("zod").ZodEnum<{
                    [x: string]: string;
                }>;
                id: import("zod").ZodString;
            }, import("better-auth").$strip>>>;
            readonly getOperators: <TApp>(config: import("../../..").RelationFieldConfig) => {
                column: {
                    contains: import("../../..").OperatorFn<string, unknown>;
                    containsAll: import("../../..").OperatorFn<string[], unknown>;
                    containsAny: import("../../..").OperatorFn<string[], unknown>;
                    isEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNotEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    count: import("../../..").OperatorFn<number, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
                jsonb: {
                    contains: import("../../..").OperatorFn<string, unknown>;
                    containsAll: import("../../..").OperatorFn<string[], unknown>;
                    containsAny: import("../../..").OperatorFn<string[], unknown>;
                    isEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNotEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    count: import("../../..").OperatorFn<number, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
            } | {
                column: {
                    some: import("../../..").OperatorFn<import("../../../fields/types").CollectionWherePlaceholder, unknown>;
                    none: import("../../..").OperatorFn<import("../../../fields/types").CollectionWherePlaceholder, unknown>;
                    every: import("../../..").OperatorFn<import("../../../fields/types").CollectionWherePlaceholder, unknown>;
                    count: import("../../..").OperatorFn<number, unknown>;
                };
                jsonb: {
                    some: import("../../..").OperatorFn<import("../../../fields/types").CollectionWherePlaceholder, unknown>;
                    none: import("../../..").OperatorFn<import("../../../fields/types").CollectionWherePlaceholder, unknown>;
                    every: import("../../..").OperatorFn<import("../../../fields/types").CollectionWherePlaceholder, unknown>;
                    count: import("../../..").OperatorFn<number, unknown>;
                };
            } | {
                column: {
                    eq: import("../../..").OperatorFn<string, unknown>;
                    ne: import("../../..").OperatorFn<string, unknown>;
                    in: import("../../..").OperatorFn<string[], unknown>;
                    notIn: import("../../..").OperatorFn<string[], unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                    is: import("../../..").OperatorFn<import("../../../fields/types").CollectionWherePlaceholder, unknown>;
                    isNot: import("../../..").OperatorFn<import("../../../fields/types").CollectionWherePlaceholder, unknown>;
                };
                jsonb: {
                    eq: import("../../..").OperatorFn<string, unknown>;
                    ne: import("../../..").OperatorFn<string, unknown>;
                    in: import("../../..").OperatorFn<string[], unknown>;
                    notIn: import("../../..").OperatorFn<string[], unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                    is: import("../../..").OperatorFn<import("../../../fields/types").CollectionWherePlaceholder, unknown>;
                    isNot: import("../../..").OperatorFn<import("../../../fields/types").CollectionWherePlaceholder, unknown>;
                };
            };
            readonly getMetadata: (config: import("../../..").RelationFieldConfig) => import("../../..").RelationFieldMetadata;
        };
        readonly object: {
            readonly type: "object";
            readonly _value: Record<string, unknown>;
            readonly toColumn: (name: string, config: import("../../..").ObjectFieldConfig) => any;
            readonly toZodSchema: (config: import("../../..").ObjectFieldConfig) => import("zod").ZodObject<{
                [x: string]: import("zod").ZodType<unknown, unknown, import("better-auth").$ZodTypeInternals<unknown, unknown>>;
            }, import("better-auth").$strip> | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodObject<{
                [x: string]: import("zod").ZodType<unknown, unknown, import("better-auth").$ZodTypeInternals<unknown, unknown>>;
            }, import("better-auth").$strip>>>;
            readonly getOperators: <TApp>(config: import("../../..").ObjectFieldConfig) => {
                column: {
                    contains: import("../../..").OperatorFn<unknown, unknown>;
                    containedBy: import("../../..").OperatorFn<unknown, unknown>;
                    hasKey: import("../../..").OperatorFn<string, unknown>;
                    hasKeys: import("../../..").OperatorFn<string[], unknown>;
                    hasAnyKeys: import("../../..").OperatorFn<string[], unknown>;
                    pathEquals: import("../../..").OperatorFn<{
                        path: string[];
                        val: unknown;
                    }, unknown>;
                    jsonPath: import("../../..").OperatorFn<string, unknown>;
                    isEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNotEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
                jsonb: {
                    contains: import("../../..").OperatorFn<unknown, unknown>;
                    containedBy: import("../../..").OperatorFn<unknown, unknown>;
                    hasKey: import("../../..").OperatorFn<string, unknown>;
                    hasKeys: import("../../..").OperatorFn<string[], unknown>;
                    isEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNotEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
            };
            readonly getMetadata: (config: import("../../..").ObjectFieldConfig) => import("../../..").NestedFieldMetadata;
        };
        readonly array: {
            readonly type: "array";
            readonly _value: unknown[];
            readonly toColumn: (name: string, config: import("../../..").ArrayFieldConfig) => any;
            readonly toZodSchema: (config: import("../../..").ArrayFieldConfig) => import("zod").ZodArray<import("zod").ZodType<unknown, unknown, import("better-auth").$ZodTypeInternals<unknown, unknown>>> | import("zod").ZodOptional<import("zod").ZodNullable<import("zod").ZodArray<import("zod").ZodType<unknown, unknown, import("better-auth").$ZodTypeInternals<unknown, unknown>>>>>;
            readonly getOperators: <TApp>(config: import("../../..").ArrayFieldConfig) => {
                column: {
                    contains: import("../../..").OperatorFn<unknown, unknown>;
                    containsAll: import("../../..").OperatorFn<unknown[], unknown>;
                    containsAny: import("../../..").OperatorFn<unknown[], unknown>;
                    containedBy: import("../../..").OperatorFn<unknown[], unknown>;
                    length: import("../../..").OperatorFn<number, unknown>;
                    lengthGt: import("../../..").OperatorFn<number, unknown>;
                    lengthLt: import("../../..").OperatorFn<number, unknown>;
                    lengthBetween: import("../../..").OperatorFn<[number, number], unknown>;
                    isEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNotEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    some: import("../../..").OperatorFn<unknown, unknown>;
                    every: import("../../..").OperatorFn<unknown, unknown>;
                    none: import("../../..").OperatorFn<unknown, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
                jsonb: {
                    contains: import("../../..").OperatorFn<unknown, unknown>;
                    containsAll: import("../../..").OperatorFn<unknown[], unknown>;
                    containedBy: import("../../..").OperatorFn<unknown[], unknown>;
                    length: import("../../..").OperatorFn<number, unknown>;
                    isEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNotEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
            };
            readonly getMetadata: (config: import("../../..").ArrayFieldConfig) => import("../../..").NestedFieldMetadata;
        };
        readonly json: {
            readonly type: "json";
            readonly _value: import("../../..").JsonValue;
            readonly toColumn: (name: string, config: import("../../..").JsonFieldConfig) => any;
            readonly toZodSchema: (config: import("../../..").JsonFieldConfig) => any;
            readonly getOperators: <TApp>(config: import("../../..").JsonFieldConfig) => {
                column: {
                    contains: import("../../..").OperatorFn<unknown, unknown>;
                    containedBy: import("../../..").OperatorFn<unknown, unknown>;
                    hasKey: import("../../..").OperatorFn<string, unknown>;
                    hasKeys: import("../../..").OperatorFn<string[], unknown>;
                    hasAnyKeys: import("../../..").OperatorFn<string[], unknown>;
                    pathEquals: import("../../..").OperatorFn<{
                        path: string[];
                        val: unknown;
                    }, unknown>;
                    pathExists: import("../../..").OperatorFn<string[], unknown>;
                    jsonPath: import("../../..").OperatorFn<string, unknown>;
                    eq: import("../../..").OperatorFn<unknown, unknown>;
                    ne: import("../../..").OperatorFn<unknown, unknown>;
                    typeof: import("../../..").OperatorFn<string, unknown>;
                    isEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNotEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
                jsonb: {
                    contains: import("../../..").OperatorFn<unknown, unknown>;
                    containedBy: import("../../..").OperatorFn<unknown, unknown>;
                    hasKey: import("../../..").OperatorFn<string, unknown>;
                    eq: import("../../..").OperatorFn<unknown, unknown>;
                    ne: import("../../..").OperatorFn<unknown, unknown>;
                    isEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNotEmpty: import("../../..").OperatorFn<boolean, unknown>;
                    isNull: import("../../..").OperatorFn<boolean, unknown>;
                    isNotNull: import("../../..").OperatorFn<boolean, unknown>;
                };
            };
            readonly getMetadata: (config: import("../../..").JsonFieldConfig) => import("../../..").FieldMetadataBase;
        };
    };
};
export type StarterModule = typeof _module;
export default _module;
declare module "questpie" {
    interface Registry {
        "~fieldTypes": typeof _fields;
    }
}
