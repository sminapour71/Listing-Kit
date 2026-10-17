/** The entire directory response: no account identity or private profile data. */
export type DirectoryAgent={slug:string;name:string;team:string;brokerage:string;headshot:string;url:string};
export type DirectoryPage={agents:DirectoryAgent[];nextOffset:number|null};
