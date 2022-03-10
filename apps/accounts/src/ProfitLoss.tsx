import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import { profitloss, google } from '@aultfarms/accounts';
import { context } from './state';
import numeral from 'numeral';
import Paper from '@mui/material/Paper';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import xlsx from 'xlsx-js-style';

const warn = debug('accounts#ProfitLoss:warn');
const info = debug('accounts#ProfitLoss:info');

function num(n: number) {
  const str = numeral(n).format('$0,0.00');
  if (n < 0) {
    return <span style={{color: 'red'}}>{str}</span>
  }
  return str;
}

export const ProfitLoss = observer(function ProfitLoss() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  const displayTypeChooser = () => {
    const toggleType = (_evt: React.MouseEvent<HTMLElement>, val: 'mkt' | 'tax') => {
      actions.profitlossType(val);
    };

    return (
      <div style={{ padding: '10px' }}>
        <ToggleButtonGroup 
          color='primary'
          onChange={toggleType} 
          exclusive 
          value={state.profitloss.type}
        >
          <ToggleButton value="mkt">Mkt</ToggleButton>
          <ToggleButton value="tax">Tax</ToggleButton>
        </ToggleButtonGroup>
      </div>
    );
  }

  const displayYearSelector = () => {
    const options = [ <MenuItem value={''}>None</MenuItem> ];
    for (const year of years) {
      options.push(<MenuItem value={year}>{year}</MenuItem>);
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', padding: 10 }}>
        Year:
        <Select 
          onChange={(evt: SelectChangeEvent) => actions.profitlossExpandYear(evt.target.value as string)}
          value={state.profitloss.expandYear}
          label="Year"
          style={{ minWidth: '100px', maxHeight: '30px' }}
        >
          {options}
        </Select>
      </div>
    );
  };

  const pls = actions.profitlosses();
  if (!pls) return <div>No profit/loss statements available yet</div>;

  let years = Object.keys(pls).sort().reverse();
  let showyears = years;
  if (state.profitloss.expandYear) {
    showyears = [ state.profitloss.expandYear ];
  }

  let catindex: { [cat: string]: true } = {};
  for (const year of years) {
    const p = pls[year]!;
    if (!p[state.profitloss.type]?.categories) {
      warn('WARNING: profit loss for year ', year, ' and type ', state.profitloss.type, ' does not exist!');
      continue;
    }
    profitloss.treeToCategoryNames(p[state.profitloss.type].categories, catindex, { excludeRoot: true });
  }
  const catnames = Object.keys(catindex).sort();
  // Now figure out how many category level columns we'll need
  let numcategorylevels = 0;
  for (const c of catnames) {
    const nl = c.split('-').length;
    if (nl > numcategorylevels) {
      numcategorylevels = nl;
    }
  }
  const maxlevel = state.profitloss.level < numcategorylevels ? state.profitloss.level : numcategorylevels;

  const displayCategoryHeader = () => {
    const ret = [];
    for (let i=0; i < maxlevel; i++) {
      ret.push(
        <TableCell key={`cattablecell-${i}`}>
          Level {i+1}
        </TableCell>
      );
    }
    return ret;
  };

  const nowstr = () => {
    return (new Date()).toISOString().replace(/T.*$/,'');
  };

  const handleUploadDownload = (year: string, direction: 'up' | 'down') => async () => {
    const pl = pls[year]![state.profitloss.type];
    const wb = profitloss.profitLossToWorkbook(pl);
    const filename = `${year}-12-31_ProfitLoss_asAt${nowstr()}.xlsx`;
    const fullpath = `${state.config.saveLocation.path}/${filename}`;
    if (direction === 'up') {
      actions.activity(`Uploading file to Google at ${fullpath}...`);
      actions.profitlossMsg(`Uploading file to Google at ${fullpath}...`);
      await google.uploadXlsxWorkbookToGoogle({ 
        parentpath: state.config.saveLocation.path,
        filename,
        workbook: wb,
      });
      actions.activity(`Upload successful to path ${fullpath}...`);
      actions.profitlossMsg(`Upload successful to path ${fullpath}...`);
    } else {
      actions.activity(`Downloading ${filename}`);
      actions.profitlossMsg(`Downloading ${filename}`);
      xlsx.writeFile(wb, filename, { bookType: 'xlsx' });
      actions.activity(`${filename} downloaded successfully`);
      actions.profitlossMsg(`${filename} downloaded successfully`);
    }
  };

  const displayYearTotalsHeader = () => {
    const ret = [];
    for (const y of showyears.sort().reverse()) {
      if (y === state.profitloss.expandYear) {
        ret.push(<TableCell>{y} Debit</TableCell>);
        ret.push(<TableCell>{y} Credit</TableCell>);
      }
      ret.push(
        <TableCell align="right">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'right' }}>
              <Button variant="outlined" onClick={handleUploadDownload(y, 'down')}>
                <DownloadIcon />
              </Button>
              <div style={{ width: '20px' }}></div>
              <Button variant="outlined" onClick={handleUploadDownload(y, 'up')}>
                <CloudUploadIcon />
              </Button>
            </div>
            {y} Net
          </div>
        </TableCell>
      );
    }
    return ret;
  };
      
  const displayNameCellsForCatname = (catname: string) => {
    const ret = [];
    const parts = catname.split('-');
    const level = parts.length - 1;
    for (let i=0; i < maxlevel; i++) {
      if (i === level) {
        ret.push(<TableCell>{parts[level]}</TableCell>);
      } else {
        ret.push(<TableCell></TableCell>);
      }
    }
    return ret;
  };

  const displayAmountsForCatname = (catname: string) => {
    const ret = [];
    for (const year of showyears) {
      let amt: string | React.ReactElement = '';
      let dbt: string | React.ReactElement = '';
      let cdt: string | React.ReactElement = '';
      const pl = pls[year]![state.profitloss.type];
      try {
        const cat = profitloss.getCategory(pl.categories, catname);
        if (!cat) {
          throw new Error(`Category ${catname} not found`);
        }
        if (year === state.profitloss.expandYear) {
          dbt = num(profitloss.debit(cat));
          cdt = num(profitloss.credit(cat));
        }
        amt = num(profitloss.amount(cat));
      } catch(e: any) {
        amt = '';
        dbt = '';
        cdt = '';
        // account doesn't exist
        info('Account ',catname, 'does not exist in year ', year, 'and type', state.profitloss.type, ' error was: ', e);
      }
      if (year === state.profitloss.expandYear) {
        ret.push(<TableCell align="right">{dbt}</TableCell>);
        ret.push(<TableCell align="right">{cdt}</TableCell>);
      }
      ret.push(<TableCell align="right">{amt}</TableCell>);
    }
    return ret;
  }

  const displayRootRow = () => {
    const ret = [];
    for (let i=0; i < maxlevel; i++) {
      ret.push(<TableCell/>);
    }
    for (const year of showyears) {
      const pl = pls[year]![state.profitloss.type];
      if (year === state.profitloss.expandYear) {
        // debit and credit
        const debit = profitloss.debit(pl.categories);
        const credit = profitloss.credit(pl.categories);
        ret.push(<TableCell align="right">{num(debit)}</TableCell>);
        ret.push(<TableCell align="right">{num(credit)}</TableCell>);
      }
      const net = num(profitloss.amount(pl.categories));
      ret.push(<TableCell align="right">{net}</TableCell>);
    }
    return <TableRow>{ret}</TableRow>;
  }

  const importantStyle = {
    backgroundColor: 'rgba(200, 255, 120, .3)',
  };
  const imp = (catname: string) => {
    return catname.split('-').length === 1;
  };

  const displayCategoryRow = (catname: string, index: number) => {
    const level = catname.split('-').length;
    if (level > state.profitloss.level) return <React.Fragment />;
    return (
      <TableRow
        key={`catprofitlossline-${index}`}
        id={`profitlosscat-${catname}`}
        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
        style={imp(catname) ? importantStyle : {}}
      >
        {displayNameCellsForCatname(catname)}
        {displayAmountsForCatname(catname)}
      </TableRow>
    );
  };

  const marks = [];
  for (let i=0; i < numcategorylevels; i++) {
    marks.push({ value: i+1, label: ''+(i+1) });
  }
  
  return (
    <Paper elevation={1}>
      <div style={{ paddingLeft: '10px', paddingRight: '10px', display: 'flex', flexDirection: 'row' }}>
        <h1>Profit/Loss - {state.profitloss.type === 'mkt' ? 'Market' : 'Tax'}</h1>
        <div style={{ flexGrow: 1 }}></div>
        {displayTypeChooser()}
        {displayYearSelector()}
        <div>
          <div style={{ paddingTop: '10px' }}>View Level:</div>
          <Slider 
            sx={{ maxWidth: '200px'}}
            label="Level" 
            value={state.profitloss.level}
            min={1}
            max={numcategorylevels}
            marks={marks}
            onChange={(_evt: Event, newval: number) => actions.profitlossLevel(newval)} 
          />
        </div>
        <div style={{width: '20px'}}></div>
      </div>
      { !state.profitloss.msg ? '' :
        <div style={{ paddingLeft: '10px' }}>{state.profitloss.msg}</div>
      }
      <TableContainer component={Paper} sx={{ maxHeight: 700 }}>
        <Table stickyHeader sx={{ minWidth: 650 }} size="small">
          <TableHead>
            <TableRow>
              {displayCategoryHeader()}
              {displayYearTotalsHeader()}
            </TableRow>
          </TableHead>
          <TableBody>
            {displayRootRow()}
            {/* catnames has every possible level of cat name, in order */}
            {catnames.map((catname, index) => displayCategoryRow(catname, index))}
          </TableBody> 
        </Table>
      </TableContainer>
    </Paper>
  )
});
