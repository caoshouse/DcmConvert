import IMAGICK from "@caoshouse/imagick";
import fs from 'fs'
import path from "path";
import dcmjsDimse from "dcmjs-dimse";
import dcmtk from "@caoshouse/dcmtk";


const { Dataset } = dcmjsDimse

export type ImageFormats = 'jpg' | 'jpeg' | 'tiff' | 'bmp' | 'png'

export type units = 'PX' | 'px' | 'IN' | 'in' | 'CM' | 'cm' | 'MM' | 'mm'

export interface DcmConvertOptions {
    dpi?: number
    background?: string
    quality?: number
    flipV?: boolean
    flipH?: boolean
    trim?: boolean
    columns?: number
    rows?: number,
    filmWidth?: number | `${number}${units}`,
    filmHeight?: number | `${number}${units}`,
    pageMargin?: number | `${number}${units}`,
    boxSpacing?: number | `${number}${units}`,
    pageRotation?: number,
    filter?: 'blur'
}

interface DcmConvertOptionsPX extends DcmConvertOptions {
    filmWidth?: number,
    filmHeight?: number,
    pageMargin?: number,
    boxSpacing?: number,
}


const isDataset = (obj: any) => {
    return ('object' === typeof obj) && (obj instanceof Dataset)
}


const tempDir = path.join(__dirname, '.temp')

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
}

const tempPath = (name: string = (new Date().getTime()) + Math.random() + ''): string => {
    const
        fullPath = path.join(tempDir, name),
        baseDir = path.dirname(fullPath)

    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true })
    }
    return fullPath
}

const clearTemporaryFiles = () => {
    const
        files = fs.readdirSync(tempDir),
        now = new Date().getTime()

    files.forEach(file => {
        file = path.join(tempDir, file)
        fs.stat(file, function (err, stat) {
            if (err) { return }
            const endTime = new Date(stat.mtime).getTime() + 600000; // 10 minutes in miliseconds
            if (now > endTime) {
                return fs.unlinkSync(file);
            }
        })
    })
}

const initialOptions: DcmConvertOptions = {
    quality: 90,
    flipV: false,
    flipH: false
}

clearTemporaryFiles()

export class DcmConvert {

    private static mergeOptions = (def: DcmConvertOptions, options: DcmConvertOptions): DcmConvertOptionsPX => {
        return DcmConvert.options2Pixel(Object.assign({}, initialOptions, def, options))
    }

    static compress(
        dcm: string | dcmjsDimse.Dataset,
        destFile: string
    ) {
        return new Promise((resolve, reject: (error: Error) => void) => {
            let dcmFileName: string

            if (isDataset(dcm)) {
                try {
                    dcmFileName = tempPath();
                    (dcm as dcmjsDimse.Dataset).toFile(dcmFileName)
                } catch (e) {
                    reject(new Error('Unable to open dicom file: ' + dcm))
                    return
                }
            } else {
                dcmFileName = dcm as string
            }

            dcmtk.exec(
                'dcmcjpls',
                `"${dcmFileName}"  "${destFile}"`,
                (error) => {
                    error ? reject(error) : resolve(dcmFileName)
                }
            )
        })
    }

    static dcm2pnm(
        format: ImageFormats,
        dcm: string | dcmjsDimse.Dataset,
        destFile: string,
        options: DcmConvertOptions
    ) {
        options = DcmConvert.mergeOptions({}, options)

        return new Promise((resolve, reject) => {

            let dcmFileName: string

            if (isDataset(dcm)) {
                try {
                    dcmFileName = tempPath();
                    (dcm as dcmjsDimse.Dataset).toFile(dcmFileName)
                } catch (e) {
                    throw new Error('Unable to open dicom file: ' + dcm)
                }
            } else {
                dcmFileName = dcm as string
            }

            try {
                let optString: string
                switch (format) {
                    case 'jpg':
                    case 'jpeg':
                        optString = `--write-jpeg "${dcmFileName}" --compr-quality ${options.quality} ${options.flipV && options.flipH ? '+Lhv' : (options.flipH ? '+Lh' : (options.flipV ? '+Lv' : ''))} "${destFile}"`
                        break
                    case 'tiff':
                        optString = `--write-tiff "${dcmFileName}"  ${options.flipV && options.flipH ? '+Lhv' : (options.flipH ? '+Lh' : (options.flipV ? '+Lv' : ''))} "${destFile}"`
                        break
                    case 'bmp':
                        optString = `--write-bmp "${dcmFileName}"  ${options.flipV && options.flipH ? '+Lhv' : (options.flipH ? '+Lh' : (options.flipV ? '+Lv' : ''))} "${destFile}"`
                        break
                    case 'png':
                        optString = `--write-png "${dcmFileName}"  ${options.flipV && options.flipH ? '+Lhv' : (options.flipH ? '+Lh' : (options.flipV ? '+Lv' : ''))} "${destFile}"`
                        break
                    default:
                        throw new Error('DcmConvert.dcm2pnm Error - invalid format: ' + format)
                }
                dcmtk.exec(
                    'dcmj2pnm',
                    optString,
                    (error) => {
                        error ? reject(error) : resolve(null)
                    }
                )
            } catch (e) {
                reject(e)
            }
        }).finally(clearTemporaryFiles)
    }


    static mosaic(
        format: ImageFormats,
        dcmArray: (string | dcmjsDimse.Dataset)[],
        destFile: string,
        config: DcmConvertOptions
    ) {

        var options = DcmConvert.mergeOptions({
            background: 'black',
            pageMargin: 0,
            boxSpacing: 0,
            pageRotation: 0,
            columns: 3,
            rows: 3
        } as DcmConvertOptions, config)



        const
            JPGFiles: (string | null)[] = [],
            boxPadding = options.boxSpacing / 2,
            cellWidth = options.filmWidth ? (options.filmWidth - options.pageMargin * 2 + boxPadding * 2) / options.columns : null,
            cellHeight = options.filmHeight ? (options.filmHeight - options.pageMargin * 2 + boxPadding * 2) / options.rows : null

        return new Promise((resolve: (destFile: string) => void, reject: (error: Error) => void) => {
            if (options.rows * options.columns < dcmArray.length) {
                reject(new Error('The ImageBoxes lenght is bigger than the layout size!'))
                return
            }
            let i=0
            while(i<dcmArray.length){
                if(!dcmArray[i]){
                    dcmArray[i]=null
                }
                i++
            }
            Promise.all(dcmArray.map(dcm => {
                if(!dcm){
                    JPGFiles.push(`null:`)
                    return
                }
                const jpgFile = tempPath()
                return DcmConvert.dcm2pnm(format, dcm, jpgFile, options)
                    .then(() => {
                        JPGFiles.push(`"${jpgFile}"`)
                    }).catch(() => {
                        JPGFiles.push('null:')
                    })
            })).finally(() => {
                let pmArr = [` ${JPGFiles.join(' ')} `]
                if (options.columns || options.columns) {
                    pmArr.push(` -tile ${options.columns || ''}x${options.rows || ''} `)
                }
                pmArr.push(' -geometry ')
                cellWidth && pmArr.push(` ${cellWidth - boxPadding * 2}`)
                pmArr.push('x')
                cellHeight && pmArr.push(`${cellHeight - boxPadding * 2}`)
                pmArr.push(`+${boxPadding}+${boxPadding} `)
                pmArr.push(` -background ${options.background} -gravity Center `)
                options.trim && pmArr.push(` -trim `)
                pmArr.push(` "${destFile}"`)

                IMAGICK.exec('montage',
                    pmArr.join(''),
                    (error) => {
                        if (error) {
                            reject(error)
                            return
                        }
                        IMAGICK.exec(
                            'convert',
                            `"${destFile}" `
                            + ' -shave ' + boxPadding + 'x' + boxPadding + ' +repage '
                            + (options.pageMargin ? ` -bordercolor "${options.background}" -border ${options.pageMargin} +repage ` : '')
                            + (options.pageRotation ? ` -rotate "${options.pageRotation}" ` : '')
                            + ` "${destFile}"`,
                            (error) => {
                                error ? reject(error) : resolve(destFile)
                            }
                        )
                    }
                );
            })
        })
    }


    /**
     * Tries to convert all strings in object to pixels
     * @param value 
     * @param dpi 
     * @returns DcmConvertOptionsPX
     */
    private static string2Pixels(value: string, dpi: number = 300): number | string {
        let
            numPart = parseFloat(value),
            unit = value.replace('' + numPart, '').toUpperCase()
        switch (unit) {
            case '':
            case 'PX':
                return numPart
                break
            case 'IN':
                break
            case 'CM':
                numPart /= 2.54
                break
            case 'MM':
                numPart /= 25.4
                break
            default:
                return value
                break
        }
        if (!dpi) {
            throw new Error('Invalid value for dpi:' + dpi)
        }
        return numPart * dpi
    }

    /**
     * Tries to convert all strings in object to pixels
     * @param obj 
     * @param dpi 
     * @returns DcmConvertOptionsPX
     */
    private static options2Pixel(obj: DcmConvertOptions, dpi?: number): DcmConvertOptionsPX {
        let ret = {}
        dpi = obj.dpi || dpi
        Object.keys(obj).forEach(k => {
            if ('string' === typeof obj[k]) {
                ret[k] = DcmConvert.string2Pixels(obj[k], dpi)
            } else if ('object' === typeof obj[k]) {
                ret[k] = DcmConvert.options2Pixel(obj[k], dpi)
            } else {
                ret[k] = obj[k]
            }
        })
        return ret
    }
}
