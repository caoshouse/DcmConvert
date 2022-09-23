"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DcmConvert = void 0;
const imagick_1 = __importDefault(require("@caoshouse/imagick"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dcmjs_dimse_1 = __importDefault(require("dcmjs-dimse"));
const dcmtk_1 = __importDefault(require("@caoshouse/dcmtk"));
const { Dataset } = dcmjs_dimse_1.default;
const isDataset = (obj) => {
    return ('object' === typeof obj) && (obj instanceof Dataset);
};
const tempDir = path_1.default.join(__dirname, '.temp');
if (!fs_1.default.existsSync(tempDir)) {
    fs_1.default.mkdirSync(tempDir, { recursive: true });
}
const tempPath = (name = (new Date().getTime()) + Math.random() + '') => {
    const fullPath = path_1.default.join(tempDir, name), baseDir = path_1.default.dirname(fullPath);
    if (!fs_1.default.existsSync(baseDir)) {
        fs_1.default.mkdirSync(baseDir, { recursive: true });
    }
    return fullPath;
};
const clearTemporaryFiles = () => {
    const files = fs_1.default.readdirSync(tempDir), now = new Date().getTime();
    files.forEach(file => {
        file = path_1.default.join(tempDir, file);
        fs_1.default.stat(file, function (err, stat) {
            if (err) {
                return;
            }
            const endTime = new Date(stat.mtime).getTime() + 600000; // 10 minutes in miliseconds
            if (now > endTime) {
                return fs_1.default.unlinkSync(file);
            }
        });
    });
};
const initialOptions = {
    quality: 90,
    flipV: false,
    flipH: false
};
clearTemporaryFiles();
class DcmConvert {
    static compress(dcm, destFile) {
        return new Promise((resolve, reject) => {
            let dcmFileName;
            if (isDataset(dcm)) {
                try {
                    dcmFileName = tempPath();
                    dcm.toFile(dcmFileName);
                }
                catch (e) {
                    reject(new Error('Unable to open dicom file: ' + dcm));
                    return;
                }
            }
            else {
                dcmFileName = dcm;
            }
            dcmtk_1.default.exec('dcmcjpls', `"${dcmFileName}"  "${destFile}"`, (error) => {
                error ? reject(error) : resolve(dcmFileName);
            });
        });
    }
    static dcm2pnm(format, dcm, destFile, options) {
        options = DcmConvert.mergeOptions({}, options);
        return new Promise((resolve, reject) => {
            let dcmFileName;
            if (isDataset(dcm)) {
                try {
                    dcmFileName = tempPath();
                    dcm.toFile(dcmFileName);
                }
                catch (e) {
                    throw new Error('Unable to open dicom file: ' + dcm);
                }
            }
            else {
                dcmFileName = dcm;
            }
            try {
                let optString;
                switch (format) {
                    case 'jpg':
                    case 'jpeg':
                        optString = `--write-jpeg "${dcmFileName}" --compr-quality ${options.quality} ${options.flipV && options.flipH ? '+Lhv' : (options.flipH ? '+Lh' : (options.flipV ? '+Lv' : ''))} "${destFile}"`;
                        break;
                    case 'tiff':
                        optString = `--write-tiff "${dcmFileName}"  ${options.flipV && options.flipH ? '+Lhv' : (options.flipH ? '+Lh' : (options.flipV ? '+Lv' : ''))} "${destFile}"`;
                        break;
                    case 'bmp':
                        optString = `--write-bmp "${dcmFileName}"  ${options.flipV && options.flipH ? '+Lhv' : (options.flipH ? '+Lh' : (options.flipV ? '+Lv' : ''))} "${destFile}"`;
                        break;
                    case 'png':
                        optString = `--write-png "${dcmFileName}"  ${options.flipV && options.flipH ? '+Lhv' : (options.flipH ? '+Lh' : (options.flipV ? '+Lv' : ''))} "${destFile}"`;
                        break;
                    default:
                        throw new Error('DcmConvert.dcm2pnm Error - invalid format: ' + format);
                }
                dcmtk_1.default.exec('dcmj2pnm', optString, (error) => {
                    error ? reject(error) : resolve(null);
                });
            }
            catch (e) {
                reject(e);
            }
        }).finally(clearTemporaryFiles);
    }
    static mosaic(format, dcmArray, destFile, config) {
        var options = DcmConvert.mergeOptions({
            background: 'black',
            pageMargin: 0,
            boxSpacing: 0,
            pageRotation: 0,
            columns: 3,
            rows: 3
        }, config);
        const JPGFiles = [], boxPadding = options.boxSpacing / 2, cellWidth = options.filmWidth ? (options.filmWidth - options.pageMargin * 2 + boxPadding * 2) / options.columns : null, cellHeight = options.filmHeight ? (options.filmHeight - options.pageMargin * 2 + boxPadding * 2) / options.rows : null;
        return new Promise((resolve, reject) => {
            if (options.rows * options.columns < dcmArray.length) {
                reject(new Error('The ImageBoxes lenght is bigger than the layout size!'));
                return;
            }
            let i = 0;
            while (i < dcmArray.length) {
                if (!dcmArray[i]) {
                    dcmArray[i] = null;
                }
                i++;
            }
            Promise.all(dcmArray.map(dcm => {
                if (!dcm) {
                    JPGFiles.push(`null:`);
                    return;
                }
                const jpgFile = tempPath();
                return DcmConvert.dcm2pnm(format, dcm, jpgFile, options)
                    .then(() => {
                    JPGFiles.push(`"${jpgFile}"`);
                }).catch(() => {
                    JPGFiles.push('null:');
                });
            })).finally(() => {
                let pmArr = [` ${JPGFiles.join(' ')} `];
                if (options.columns || options.columns) {
                    pmArr.push(` -tile ${options.columns || ''}x${options.rows || ''} `);
                }
                pmArr.push(' -geometry ');
                cellWidth && pmArr.push(` ${cellWidth - boxPadding * 2}`);
                pmArr.push('x');
                cellHeight && pmArr.push(`${cellHeight - boxPadding * 2}`);
                pmArr.push(`+${boxPadding}+${boxPadding} `);
                pmArr.push(` -background ${options.background} -gravity Center `);
                options.trim && pmArr.push(` -trim `);
                pmArr.push(` "${destFile}"`);
                imagick_1.default.exec('montage', pmArr.join(''), (error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    imagick_1.default.exec('convert', `"${destFile}" `
                        + ' -shave ' + boxPadding + 'x' + boxPadding + ' +repage '
                        + (options.pageMargin ? ` -bordercolor "${options.background}" -border ${options.pageMargin} +repage ` : '')
                        + (options.pageRotation ? ` -rotate "${options.pageRotation}" ` : '')
                        + ` "${destFile}"`, (error) => {
                        error ? reject(error) : resolve(destFile);
                    });
                });
            });
        });
    }
    /**
     * Tries to convert all strings in object to pixels
     * @param value
     * @param dpi
     * @returns DcmConvertOptionsPX
     */
    static string2Pixels(value, dpi = 300) {
        let numPart = parseFloat(value), unit = value.replace('' + numPart, '').toUpperCase();
        switch (unit) {
            case '':
            case 'PX':
                return numPart;
                break;
            case 'IN':
                break;
            case 'CM':
                numPart /= 2.54;
                break;
            case 'MM':
                numPart /= 25.4;
                break;
            default:
                return value;
                break;
        }
        if (!dpi) {
            throw new Error('Invalid value for dpi:' + dpi);
        }
        return numPart * dpi;
    }
    /**
     * Tries to convert all strings in object to pixels
     * @param obj
     * @param dpi
     * @returns DcmConvertOptionsPX
     */
    static options2Pixel(obj, dpi) {
        let ret = {};
        dpi = obj.dpi || dpi;
        Object.keys(obj).forEach(k => {
            if ('string' === typeof obj[k]) {
                ret[k] = DcmConvert.string2Pixels(obj[k], dpi);
            }
            else if ('object' === typeof obj[k]) {
                ret[k] = DcmConvert.options2Pixel(obj[k], dpi);
            }
            else {
                ret[k] = obj[k];
            }
        });
        return ret;
    }
}
exports.DcmConvert = DcmConvert;
DcmConvert.mergeOptions = (def, options) => {
    return DcmConvert.options2Pixel(Object.assign({}, initialOptions, def, options));
};
