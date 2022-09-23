"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.blur = void 0;
const dcmjs_dimse_1 = __importDefault(require("dcmjs-dimse"));
const log = dcmjs_dimse_1.default.log;
function blur(format, dcmIn, fileOut) {
    log.info(arguments.toString());
}
exports.blur = blur;
