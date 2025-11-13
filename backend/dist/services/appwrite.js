"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminClient = createAdminClient;
exports.createSessionClient = createSessionClient;
const node_appwrite_1 = require("node-appwrite");
// Admin client — uses server-side API key
function createAdminClient() {
    const client = new node_appwrite_1.Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT)
        .setKey(process.env.APPWRITE_API_KEY);
    return {
        account: new node_appwrite_1.Account(client),
        database: new node_appwrite_1.Databases(client),
        users: new node_appwrite_1.Users(client),
    };
}
// Session client — reads session secret from request cookies
function createSessionClient(req) {
    var _a;
    const session = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a['appwrite-session'];
    if (!session) {
        throw new Error('No session cookie');
    }
    const client = new node_appwrite_1.Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT)
        .setSession(session);
    return {
        account: new node_appwrite_1.Account(client),
    };
}
