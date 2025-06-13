"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getISOTimestamp = getISOTimestamp;
function getISOTimestamp(input) {
    if (input) {
        const parsed = new Date(input);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString();
        }
        else {
            throw new Error('Invalid timestamp format');
        }
    }
    const nowJordan = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Amman'
    });
    return new Date(nowJordan).toISOString();
}
