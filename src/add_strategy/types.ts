export type LogFilter = {
    level: string | null;
    name: string | null;
    exclude_name: string | null;
    limit: number | null;
    start: number | null;
};

export type LogFileEntry = {
    asctime: string;
    levelname: string;
    name: string;
    module: string;
    funcName: string;
    lineno: string;
    message: string;
};
