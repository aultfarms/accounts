import dayjs from 'dayjs';
import debug from 'debug';
import type { TagRange, Tag, IncomingRecord, LivestockRecords } from './types.js';

const warn = debug('af/livestock#util:warn');
//-------------------------------------------------------------
// Tag Helpers
//-------------------------------------------------------------

// Note that a tag range is pre-processed to ensure that it
// only has tags of the same color.  If there is a color
// split on a group, the group will have 2 separate ranges.
export function rangeContainsTag(r: TagRange, tag: Tag): boolean {
  return (
    tag.color === r.start.color &&
    tag.number >= r.start.number && 
    tag.number <= r.end.number
  );
}

export function groupContainsTag(group: IncomingRecord, tag: Tag): boolean {
  return !!group.tags?.find(r => rangeContainsTag(r,tag));
};


// groupForTag has to deal with historic repeated tag color/number
// combinations.  i.e. 3 years ago another "RED13" may have existed.
// We need to figure out which one of these is the "correct" one.
// This can be slightly fuzzy, because one or two mistakes is not
// going to break the bank.
//
// The simplest algorithm is one that assumes there is only one
// of each combo on-site at any given time.  Therefore, when a 
// new group comes in and gets tagged, they supercede any previous
// version of that tag.  So the "latest" copy of the tag is always
// the "correct" one for "today".
//
// Unfortunately, sometimes our scripts may want to compute historic death
// loss and things like that.  "historic" means sometimes we're looking in 
// a date range that is not "today".  Therefore, we have to uglify this 
// function definition by adding a third optional parameter of "asOfDate"
// which is the ballpark date of interest: i.e. it will take the tag number
// as of that day.
export function groupForTag(
  records: LivestockRecords,
  tag: Tag,
  asOfDateString: string | false = false
): IncomingRecord | false {
  const groups = records.incoming.records;
  // If the tag already has a "groupname" key, just return that:
  if (tag && tag.groupname) 
    return groups.find(g => g.groupname === tag.groupname) || false;

  const allfound = groups.filter(g => groupContainsTag(g,tag));
  // if none, return false:
  if (!allfound || allfound.length < 1) return false;
  const asOfDate = asOfDateString ? dayjs(asOfDateString, 'YYYY-MM-DD') : dayjs();

  const filteredToDate = allfound.filter(g => !dayjs(g.date,'YYYY-MM-DD').isAfter(asOfDate)); // !isAfter = equal or before
  if (!filteredToDate || filteredToDate.length < 1) {
    warn('WARNING: groupForTag: found multiple possible groups (',allfound,') for tag (',tag,'), but after filtering for date (',asOfDate,') there were none left!');
    return false;
  }
  // string comparison below from https://stackoverflow.com/questions/1179366/is-there-a-javascript-strcmp:
  filteredToDate.sort((g1,g2) => (g1.date < g2.date ? -1 : +(g1.date > g2.date)));
  // default lexical sorting will put oldest on top, newest on bottom.  
  // Need to take the newest one that is prior to the reference date
  return filteredToDate[filteredToDate.length-1] || false;
};

export function tagStrToObj(str:string): Tag | null {
  str = str.trim();
  // First, check if it is group-prefixed tag:
  const groupmatches = str.match(/^([A-Z]+:[A-Z]{3}[0-9]{2}-[0-9A-Z]):([A-Za-z]+) *([0-9]+)$/);
  if (groupmatches) {
    if (!groupmatches[2]) {
      warn('WARNING: attempted to convert string ', str, 'to tag, but color was invalid.  Matches = ', groupmatches);
    }
    return { 
      groupname: groupmatches[1], 
      color: groupmatches[2] || 'UNKNOWNCOLOR', 
      number: +(groupmatches[3] || 1) 
    };
  }
  // Otherwise, it is just a color/number combo:
  const matches = str.match(/^([A-Za-z]+) ?([0-9]+)?$/);
  if (!matches) {
    warn('WARNING: tag string', str, 'did not match pattern for a tag string');
    return null;
  }

  if (!matches[1] || !matches[2]) {
    warn('WARNING: attempted to convert string ', str, 'to tag (not a group tag), but had invalid matches.  Matches = ', matches);
    return null;
  }
  return { 
    color: matches[1] || 'UNKNOWNCOLOR', 
    number: +(matches[2] || 1),
  };
}

export function tagObjToStr(t: Tag): string {
  if (!t) {
    warn('WARNING: attempted to convert tag object', t, 'to string, but t was falsey');
    return '';
  }
  let str = '';
  if (t.groupname) str += t.groupname+':'; // group:colornumber
  str += (t.color || '');
  str += (t.number || '');
  return str;
}


