"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const sentry_example_api_1 = __importDefault(require("./routes/sentry-example-api"));
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const banks_1 = __importDefault(require("./routes/banks"));
const transactions_1 = __importDefault(require("./routes/transactions"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
// enable CORS for local frontend (allow credentials for cookie-based auth)
const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001'].filter(Boolean);
app.use((0, cors_1.default)({ origin: allowedOrigins, credentials: true }));
app.use((0, cookie_parser_1.default)());
// mount routes
app.use('/api/sentry-example-api', sentry_example_api_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/user', user_1.default);
app.use('/api/banks', banks_1.default);
app.use('/api/transactions', transactions_1.default);
const port = process.env.PORT || 4000;
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Backend listening on port ${port}`);
    });
}
exports.default = app;
