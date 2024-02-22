export type ErrorRecord = {
  cardName?: string,
  idList?: string,
  id?: string,
  error: string,
};

export type Tag = {
  number: number;
  color: string;
  groupname?: string;
};

export type TagRange = {
  start: Tag;
  end: Tag;
};

export type DeadRecord = {
  date: string,
  tags: Tag[],
  note?: string | false,
  id: string,               // ID of card
  idList: string,           // ID of dead list
  cardName: string,         // original card name for debugging
  dateLastActivity: string, // for sorting by "recent"-ness
};

export type IncomingRecord = {
  date: string,
  groupname: string,
  into?: string,
  weight?: number,
  head?: number,
  tags?: TagRange[],
  dead?: DeadRecord[],
  id: string, // id of card
  idList: string,
  cardName: string,
  dateLastActivity: string,
};

export type TreatmentRecord = {
  date: string,
  treatment: string,
  tags: Tag[],
  id: string, // id of card
  idList: string,
  cardName: string,
  dateLastActivity: string,
};

export type TagColors = {
  [color: string]: string, // ORANCE: #FF9900
};

export type LivestockRecords = {
  dead: {
    records: DeadRecord[],
    errors: ErrorRecord[],
  },
  incoming: {
    records: IncomingRecord[],
    errors: ErrorRecord[],
  },
  treatments: {
    records: TreatmentRecord[],
    errors: ErrorRecord[],
  },
  tagcolors: TagColors,
};


//------------------------------------------------------------
// Weights
//------------------------------------------------------------

export type SpreadsheetInfo = {
  id: string, // ID of the spreadsheet file in Google Drive
  path: string, // original path+filename of the spreadsheet
  worksheetName: string, // name of worksheet in the spreadsheet that you want to read/edit
};


export type WeightRecord = {
  lineno: number,
  weighdate: string,
  tag: Tag,
  weight: number,
  adj_wt: number,
  group: string,
  in_date: string,
  days: number,
  lbs_gain: number,
  rog: number,
  sort: string,
};

export type ErrorWeight = {
  lineno: number,
  sheetinfo: SpreadsheetInfo,
  row: { [key: string]: any }, // the row object with the error
  msg: string,
  error: any, // Normally an Error object
};

export type WeightRecordsInfo = {
  sheetinfo: SpreadsheetInfo,
  header: string[],
  weights: WeightRecord[],
  errors: ErrorWeight[],
};

export function assertWeightRecord(o: any): asserts o is WeightRecord {
  if (!o) throw `ERROR: Not a WeightRecord: object is falsey`;
  if (typeof o !== 'object') throw `ERROR: Not a WeightRecord: not an object`;
  if (typeof o.weighdate !== 'string' && !o.weighdate.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) throw `ERROR: Not a WeightRecord: weighdate (${o.weighdate}) is not a date string`;
  if (!o.tag || typeof o.tag !== 'object') throw `ERROR: Not a WeightRecord: tag (${o.tag}) is not an object`;
  if (typeof o.tag.color !== 'string') throw `ERROR: Not a WeightRecord: tag.color (${o.tag.color}) is not a string`;
  if (typeof o.tag.number !== 'number') throw `ERROR: Not a WeightRecord: tag.number (${o.tag.number}) is not a number`;
  if (typeof o.weight !== 'number') throw `ERROR: Not a WeightRecord: weight (${o.weight}) is not a number`;
  if (typeof o.adj_wt !== 'number') throw `ERROR: Not a WeightRecord: adj_wt (${o.adj_wt}) is not a number`;
  if (typeof o.group !== 'string') throw `ERROR: Not a WeightRecord: group (${o.group}) is not a string`;
  if (typeof o.in_date !== 'string' && !o.weighdate.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) throw `ERROR: Not a WeightRecord: in_date (${o.in_date}) is not a date string`;
  if (typeof o.days !== 'number') throw `ERROR: Not a WeightRecord: days (${o.days}) is not a number`;
  if (typeof o.lbs_gain !== 'number') throw `ERROR: Not a WeightRecord: lbs_gain (${o.lbs_gain}) is not a number`;
  if (typeof o.rog !== 'number') throw `ERROR: Not a WeightRecord: rog (${o.rog}) is not a number`;
  if (typeof o.sort !== 'string') throw `ERROR: Not a WeightRecord: sort (${o.sort}) is not a string`;
}

export type ComputedStats = {
  sorts: GroupWeightStats,
  incoming: GroupWeightStats,
  sources: GroupWeightStats,
  ranges: GroupWeightStats,
  days: GroupWeightStats,
  months: GroupWeightStats,
  years: GroupWeightStats,
}
export type WeightStat = {
  adj_wt: number,  // notags DO affect this number
  notags: number,  // count of just the no-tags
  count: number,   // count WITHOUT the no-tags
  lbsGain: number, // notags DO NOT affect this number
  days: number,    // notags DO NOT affect this number 
}
export type GroupWeightStats = {
  [key: string]: WeightStat,
}
