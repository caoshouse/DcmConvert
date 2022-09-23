
import dcmjsDimse from "dcmjs-dimse";
import { ImageFormats, units } from ".";

const log = dcmjsDimse.log

export function blur(format: ImageFormats, dcmIn: string | dcmjsDimse.Dataset, fileOut: string) {
    log.info(arguments.toString())
}