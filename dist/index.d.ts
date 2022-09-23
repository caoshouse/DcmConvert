import dcmjsDimse from "dcmjs-dimse";
export declare type ImageFormats = 'jpg' | 'jpeg' | 'tiff' | 'bmp' | 'png';
export declare type units = 'PX' | 'px' | 'IN' | 'in' | 'CM' | 'cm' | 'MM' | 'mm';
export interface DcmConvertOptions {
    dpi?: number;
    background?: string;
    quality?: number;
    flipV?: boolean;
    flipH?: boolean;
    trim?: boolean;
    columns?: number;
    rows?: number;
    filmWidth?: number | `${number}${units}`;
    filmHeight?: number | `${number}${units}`;
    pageMargin?: number | `${number}${units}`;
    boxSpacing?: number | `${number}${units}`;
    pageRotation?: number;
    filter?: 'blur';
}
export declare class DcmConvert {
    private static mergeOptions;
    static compress(dcm: string | dcmjsDimse.Dataset, destFile: string): Promise<unknown>;
    static dcm2pnm(format: ImageFormats, dcm: string | dcmjsDimse.Dataset, destFile: string, options: DcmConvertOptions): Promise<unknown>;
    static mosaic(format: ImageFormats, dcmArray: (string | dcmjsDimse.Dataset)[], destFile: string, config: DcmConvertOptions): Promise<string>;
    /**
     * Tries to convert all strings in object to pixels
     * @param value
     * @param dpi
     * @returns DcmConvertOptionsPX
     */
    private static string2Pixels;
    /**
     * Tries to convert all strings in object to pixels
     * @param obj
     * @param dpi
     * @returns DcmConvertOptionsPX
     */
    private static options2Pixel;
}
