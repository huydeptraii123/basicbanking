"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const fs_1 = __importDefault(require("fs"));
const dataDir = process.env.DB_DATA_DIR || (0, path_1.join)(__dirname, '..', 'data');
if (!fs_1.default.existsSync(dataDir))
    fs_1.default.mkdirSync(dataDir, { recursive: true });
const file = (0, path_1.join)(dataDir, 'db.json');
function readFile() {
    try {
        const raw = fs_1.default.readFileSync(file, 'utf8');
        return JSON.parse(raw);
    }
    catch (e) {
        return { users: [], banks: [], transactions: [] };
    }
}
function writeFile(data) {
    fs_1.default.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
const db = {
    data: readFile(),
    read() {
        this.data = readFile();
    },
    write() {
        writeFile(this.data);
    },
};
// ensure file exists
db.write();
exports.default = db;
