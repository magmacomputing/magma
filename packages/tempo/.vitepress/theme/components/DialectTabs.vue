<script setup lang="ts">
import { ref, computed } from 'vue';

interface TokenMapping {
  external: string;
  tempo: string;
  category: 'Year' | 'Month' | 'Day' | 'Hour' | 'Minute' | 'Second' | 'Fractional' | 'Timezone' | 'Weekday' | 'Week' | 'Quarter' | 'Epoch' | 'Other';
  description: string;
  example: string;
  notes?: string;
}

interface DialectConfig {
  id: string;
  name: string;
  icon: string;
  ecosystem: string;
  aliases: string[];
  syntaxNote: string;
  sampleParse: string;
  sampleFormat: string;
  tokens: TokenMapping[];
}

const DIALECTS: DialectConfig[] = [
  {
    id: 'ldml',
    name: 'Unicode LDML',
    icon: '🌐',
    ecosystem: 'date-fns, Luxon, Angular, CLDR / UTS #35',
    aliases: ['luxon', 'datefns', 'cldr'],
    syntaxNote: "Wrap literal text in single quotes: 'Date: ' yyyy-MM-dd. Escaped quote: ''",
    sampleParse: "Tempo.fromFormat('2026-10-24 15:30:45', 'yyyy-MM-dd HH:mm:ss', { dialect: 'ldml' })",
    sampleFormat: "t.format('yyyy-MM-dd HH:mm:ss.SSS zzzz', { dialect: 'ldml' })",
    tokens: [
      { external: 'yyyy', tempo: '{yyyy}', category: 'Year', description: '4-digit calendar year', example: '2026' },
      { external: 'yy', tempo: '{yy}', category: 'Year', description: '2-digit calendar year', example: '26' },
      { external: 'y', tempo: '{yyyy}', category: 'Year', description: 'Calendar year without zero-padding', example: '2026' },
      { external: 'YYYY', tempo: '{yow}', category: 'Year', description: '4-digit ISO week-numbering year', example: '2026' },
      { external: 'YY', tempo: '{yow:2}', category: 'Year', description: '2-digit ISO week-numbering year', example: '26' },
      { external: 'MM', tempo: '{mm}', category: 'Month', description: 'Zero-padded numeric month (01–12)', example: '10' },
      { external: 'M', tempo: '{mm:raw}', category: 'Month', description: 'Unpadded numeric month (1–12)', example: '10' },
      { external: 'MMM / LLL', tempo: '{mmm}', category: 'Month', description: 'Abbreviated month name', example: 'Oct' },
      { external: 'MMMM / LLLL', tempo: '{mon}', category: 'Month', description: 'Full month name', example: 'October' },
      { external: 'dd', tempo: '{dd}', category: 'Day', description: 'Zero-padded day of month (01–31)', example: '24' },
      { external: 'd', tempo: '{dd:raw}', category: 'Day', description: 'Unpadded day of month (1–31)', example: '24' },
      { external: 'DDD', tempo: '{doy}', category: 'Day', description: 'Zero-padded day of year (001–366)', example: '297' },
      { external: 'D', tempo: '{doy:raw}', category: 'Day', description: 'Unpadded day of year (1–366)', example: '297' },
      { external: 'ww', tempo: '{woy}', category: 'Week', description: 'Zero-padded ISO week of year (01–53)', example: '43' },
      { external: 'w', tempo: '{woy:raw}', category: 'Week', description: 'Unpadded ISO week of year (1–53)', example: '43' },
      { external: 'EEEE', tempo: '{wkd}', category: 'Weekday', description: 'Full weekday name', example: 'Saturday' },
      { external: 'EEE', tempo: '{www}', category: 'Weekday', description: 'Abbreviated weekday name', example: 'Sat' },
      { external: 'e / c', tempo: '{dow}', category: 'Weekday', description: 'Numeric day of week (1=Monday..7=Sunday)', example: '6' },
      { external: 'HH', tempo: '{hh}', category: 'Hour', description: 'Zero-padded 24-hour (00–23)', example: '15' },
      { external: 'H', tempo: '{hh:raw}', category: 'Hour', description: 'Unpadded 24-hour (0–23)', example: '15' },
      { external: 'hh', tempo: '{h12}', category: 'Hour', description: 'Zero-padded 12-hour (01–12)', example: '03' },
      { external: 'h', tempo: '{h12:raw}', category: 'Hour', description: 'Unpadded 12-hour (1–12)', example: '3' },
      { external: 'kk', tempo: '{hh}', category: 'Hour', description: '24-hour clock (01–24), 24:00 normalized to 00:00', example: '15' },
      { external: 'k', tempo: '{hh:raw}', category: 'Hour', description: 'Unpadded 24-hour clock (1–24)', example: '15' },
      { external: 'mm', tempo: '{mi}', category: 'Minute', description: 'Zero-padded minute (00–59)', example: '30' },
      { external: 'm', tempo: '{mi:raw}', category: 'Minute', description: 'Unpadded minute (0–59)', example: '30' },
      { external: 'ss', tempo: '{ss}', category: 'Second', description: 'Zero-padded second (00–59)', example: '45' },
      { external: 's', tempo: '{ss:raw}', category: 'Second', description: 'Unpadded second (0–59)', example: '45' },
      { external: 'SSS', tempo: '{ms}', category: 'Fractional', description: 'Milliseconds (3 digits)', example: '123' },
      { external: 'SSSSSS', tempo: '{ff:6}', category: 'Fractional', description: 'Microseconds (6 digits)', example: '123456' },
      { external: 'SSSSSSSSS', tempo: '{ff:9}', category: 'Fractional', description: 'Nanoseconds (9 digits)', example: '123456789' },
      { external: 'aa / a', tempo: '{mer:upper}', category: 'Hour', description: 'AM / PM meridiem indicator', example: 'PM' },
      { external: 'z', tempo: '{tz:short}', category: 'Timezone', description: 'Short timezone abbreviation', example: 'EDT' },
      { external: 'zzzz', tempo: '{tz}', category: 'Timezone', description: 'Full timezone identifier', example: 'America/New_York' },
      { external: 'ZZZZZ / XXX', tempo: '{tz:offset}', category: 'Timezone', description: 'ISO 8601 offset with colon', example: '+08:00' },
      { external: 'ZZ / XX', tempo: '{tz:offsetcompact}', category: 'Timezone', description: 'Compact offset without colon', example: '+0800' },
      { external: 'QQQQ / qqqq', tempo: '{#quarter}', category: 'Quarter', description: 'Full quarter name', example: '4th quarter' },
      { external: 'Q / q', tempo: '{#quarter:num}', category: 'Quarter', description: 'Numeric quarter (1–4)', example: '4' }
    ]
  },
  {
    id: 'moment',
    name: 'Moment.js / Day.js',
    icon: '⚡',
    ecosystem: 'Moment.js, Day.js',
    aliases: ['dayjs'],
    syntaxNote: 'Wrap literal text in square brackets: [Report Date:] YYYY-MM-DD. Bare characters outside tokens remain literal.',
    sampleParse: "Tempo.fromFormat('2026-10-24 15:30:45', 'YYYY-MM-DD HH:mm:ss', { dialect: 'moment' })",
    sampleFormat: "t.format('dddd, MMMM Do YYYY, h:mm:ss a', { dialect: 'moment' })",
    tokens: [
      { external: 'YYYY', tempo: '{yyyy}', category: 'Year', description: '4-digit calendar year', example: '2026' },
      { external: 'YY', tempo: '{yy}', category: 'Year', description: '2-digit calendar year', example: '26' },
      { external: 'Y', tempo: '{yyyy}', category: 'Year', description: 'Calendar year without zero-padding', example: '2026' },
      { external: 'GGGG', tempo: '{yow}', category: 'Year', description: '4-digit ISO week-numbering year', example: '2026' },
      { external: 'GG', tempo: '{yow:2}', category: 'Year', description: '2-digit ISO week-numbering year', example: '26' },
      { external: 'MM', tempo: '{mm}', category: 'Month', description: 'Zero-padded month (01–12)', example: '10' },
      { external: 'M', tempo: '{mm:raw}', category: 'Month', description: 'Unpadded month (1–12)', example: '10' },
      { external: 'MMM', tempo: '{mmm}', category: 'Month', description: 'Abbreviated month name', example: 'Oct' },
      { external: 'MMMM', tempo: '{mon}', category: 'Month', description: 'Full month name', example: 'October' },
      { external: 'DD', tempo: '{dd}', category: 'Day', description: 'Zero-padded day of month (01–31)', example: '24' },
      { external: 'D', tempo: '{dd:raw}', category: 'Day', description: 'Unpadded day of month (1–31)', example: '24' },
      { external: 'Do', tempo: '{dd:ord}', category: 'Day', description: 'Ordinal day of month', example: '24th' },
      { external: 'DDDD', tempo: '{doy}', category: 'Day', description: 'Zero-padded day of year (001–366)', example: '297' },
      { external: 'DDD', tempo: '{doy:raw}', category: 'Day', description: 'Unpadded day of year (1–366)', example: '297' },
      { external: 'WW', tempo: '{woy}', category: 'Week', description: 'Zero-padded ISO week of year (01–53)', example: '43' },
      { external: 'W', tempo: '{woy:raw}', category: 'Week', description: 'Unpadded ISO week of year (1–53)', example: '43' },
      { external: 'dddd', tempo: '{wkd}', category: 'Weekday', description: 'Full weekday name', example: 'Saturday' },
      { external: 'ddd', tempo: '{www}', category: 'Weekday', description: 'Abbreviated weekday name', example: 'Sat' },
      { external: 'dd', tempo: '{ww}', category: 'Weekday', description: 'Two-letter minimal weekday name', example: 'Sa' },
      { external: 'E', tempo: '{dow}', category: 'Weekday', description: 'ISO day of week (1=Monday..7=Sunday)', example: '6' },
      { external: 'HH', tempo: '{hh}', category: 'Hour', description: 'Zero-padded 24-hour (00–23)', example: '15' },
      { external: 'H', tempo: '{hh:raw}', category: 'Hour', description: 'Unpadded 24-hour (0–23)', example: '15' },
      { external: 'hh', tempo: '{h12}', category: 'Hour', description: 'Zero-padded 12-hour (01–12)', example: '03' },
      { external: 'h', tempo: '{h12:raw}', category: 'Hour', description: 'Unpadded 12-hour (1–12)', example: '3' },
      { external: 'kk', tempo: '{hh}', category: 'Hour', description: '24-hour clock (01–24), normalized to 00-23', example: '15' },
      { external: 'k', tempo: '{hh:raw}', category: 'Hour', description: 'Unpadded 24-hour clock (1–24)', example: '15' },
      { external: 'mm', tempo: '{mi}', category: 'Minute', description: 'Zero-padded minute (00–59)', example: '30' },
      { external: 'm', tempo: '{mi:raw}', category: 'Minute', description: 'Unpadded minute (0–59)', example: '30' },
      { external: 'ss', tempo: '{ss}', category: 'Second', description: 'Zero-padded second (00–59)', example: '45' },
      { external: 's', tempo: '{ss:raw}', category: 'Second', description: 'Unpadded second (0–59)', example: '45' },
      { external: 'SSS', tempo: '{ms}', category: 'Fractional', description: 'Milliseconds (3 digits)', example: '123' },
      { external: 'SSSSSS', tempo: '{ff:6}', category: 'Fractional', description: 'Microseconds (6 digits)', example: '123456' },
      { external: 'SSSSSSSSS', tempo: '{ff:9}', category: 'Fractional', description: 'Nanoseconds (9 digits)', example: '123456789' },
      { external: 'A', tempo: '{mer:upper}', category: 'Hour', description: 'Uppercase meridiem (AM / PM)', example: 'PM' },
      { external: 'a', tempo: '{mer}', category: 'Hour', description: 'Lowercase meridiem (am / pm)', example: 'pm' },
      { external: 'Z', tempo: '{tz:offset}', category: 'Timezone', description: 'Standard offset with colon', example: '+08:00' },
      { external: 'ZZ', tempo: '{tz:offsetcompact}', category: 'Timezone', description: 'Compact offset without colon', example: '+0800' },
      { external: 'z / zz', tempo: '{tz:short}', category: 'Timezone', description: 'Timezone abbreviation', example: 'EDT' },
      { external: 'X', tempo: '{ts}', category: 'Epoch', description: 'Unix epoch timestamp in seconds', example: '1792848645' },
      { external: 'x', tempo: '{ts:ms}', category: 'Epoch', description: 'Unix epoch timestamp in milliseconds', example: '1792848645000' },
      { external: 'Q', tempo: '{#quarter:num}', category: 'Quarter', description: 'Quarter of year (1–4)', example: '4' },
      { external: 'Qo', tempo: '{#quarter:ord}', category: 'Quarter', description: 'Ordinal quarter of year', example: '4th' }
    ]
  },
  {
    id: 'strftime',
    name: 'POSIX strftime',
    icon: '🐧',
    ecosystem: 'C, Python (datetime.strftime), Ruby, Linux / POSIX systems',
    aliases: ['posix', 'c', 'python'],
    syntaxNote: 'All characters not prefixed with % are literal. Use %% for a literal percent sign.',
    sampleParse: "Tempo.fromFormat('2026-10-24 15:30:45', '%Y-%m-%d %H:%M:%S', { dialect: 'strftime' })",
    sampleFormat: "t.format('%A, %B %d, %Y %I:%M:%S %p %z', { dialect: 'strftime' })",
    tokens: [
      { external: '%Y', tempo: '{yyyy}', category: 'Year', description: '4-digit calendar year', example: '2026' },
      { external: '%y', tempo: '{yy}', category: 'Year', description: '2-digit year (00–99)', example: '26' },
      { external: '%G', tempo: '{yow}', category: 'Year', description: '4-digit ISO week-numbering year', example: '2026' },
      { external: '%g', tempo: '{yow:2}', category: 'Year', description: '2-digit ISO week-numbering year', example: '26' },
      { external: '%C', tempo: '{yow:cent}', category: 'Year', description: 'Century number (year / 100)', example: '20' },
      { external: '%m', tempo: '{mm}', category: 'Month', description: 'Zero-padded month (01–12)', example: '10' },
      { external: '%-m', tempo: '{mm:raw}', category: 'Month', description: 'Unpadded month (1–12)', example: '10' },
      { external: '%b / %h', tempo: '{mmm}', category: 'Month', description: 'Abbreviated month name', example: 'Oct' },
      { external: '%B', tempo: '{mon}', category: 'Month', description: 'Full month name', example: 'October' },
      { external: '%d', tempo: '{dd}', category: 'Day', description: 'Zero-padded day of month (01–31)', example: '24' },
      { external: '%-d', tempo: '{dd:raw}', category: 'Day', description: 'Unpadded day of month (1–31)', example: '24' },
      { external: '%e', tempo: '{dd:space}', category: 'Day', description: 'Space-padded day of month ( 1–31)', example: '24' },
      { external: '%j', tempo: '{doy}', category: 'Day', description: 'Zero-padded day of year (001–366)', example: '297' },
      { external: '%V', tempo: '{woy}', category: 'Week', description: 'ISO week number (01–53)', example: '43' },
      { external: '%U / %W', tempo: '{woy}', category: 'Week', description: 'Sunday / Monday based week number', example: '43' },
      { external: '%A', tempo: '{wkd}', category: 'Weekday', description: 'Full weekday name', example: 'Saturday' },
      { external: '%a', tempo: '{www}', category: 'Weekday', description: 'Abbreviated weekday name', example: 'Sat' },
      { external: '%u', tempo: '{dow}', category: 'Weekday', description: 'ISO weekday (1=Monday..7=Sunday)', example: '6' },
      { external: '%w', tempo: '{dow:0}', category: 'Weekday', description: 'Weekday (0=Sunday..6=Saturday)', example: '6' },
      { external: '%H', tempo: '{hh}', category: 'Hour', description: 'Zero-padded 24-hour (00–23)', example: '15' },
      { external: '%-H', tempo: '{hh:raw}', category: 'Hour', description: 'Unpadded 24-hour (0–23)', example: '15' },
      { external: '%k', tempo: '{hh:space}', category: 'Hour', description: 'Space-padded 24-hour ( 0–23)', example: '15' },
      { external: '%I', tempo: '{h12}', category: 'Hour', description: 'Zero-padded 12-hour (01–12)', example: '03' },
      { external: '%-I', tempo: '{h12:raw}', category: 'Hour', description: 'Unpadded 12-hour (1–12)', example: '3' },
      { external: '%l', tempo: '{h12:space}', category: 'Hour', description: 'Space-padded 12-hour ( 1–12)', example: ' 3' },
      { external: '%M', tempo: '{mi}', category: 'Minute', description: 'Zero-padded minute (00–59)', example: '30' },
      { external: '%-M', tempo: '{mi:raw}', category: 'Minute', description: 'Unpadded minute (0–59)', example: '30' },
      { external: '%S', tempo: '{ss}', category: 'Second', description: 'Zero-padded second (00–59)', example: '45' },
      { external: '%-S', tempo: '{ss:raw}', category: 'Second', description: 'Unpadded second (0–59)', example: '45' },
      { external: '%p', tempo: '{mer:upper}', category: 'Hour', description: 'Uppercase meridiem (AM / PM)', example: 'PM' },
      { external: '%P', tempo: '{mer}', category: 'Hour', description: 'Lowercase meridiem (am / pm)', example: 'pm' },
      { external: '%3f', tempo: '{ms}', category: 'Fractional', description: 'Milliseconds (Tempo extension, 3 digits)', example: '123' },
      { external: '%f / %6f', tempo: '{ff:6}', category: 'Fractional', description: 'Microseconds (6 digits, Python %f)', example: '123456' },
      { external: '%9f', tempo: '{ff:9}', category: 'Fractional', description: 'Nanoseconds (Tempo extension, 9 digits)', example: '123456789' },
      { external: '%Z', tempo: '{tz:short}', category: 'Timezone', description: 'Timezone abbreviation or name', example: 'EDT' },
      { external: '%z', tempo: '{tz:offsetcompact}', category: 'Timezone', description: 'Compact timezone offset', example: '+0800' },
      { external: '%:z', tempo: '{tz:offset}', category: 'Timezone', description: 'Timezone offset with colon', example: '+08:00' },
      { external: '%s', tempo: '{ts}', category: 'Epoch', description: 'Unix epoch timestamp in seconds', example: '1792848645' },
      { external: '%%', tempo: '%', category: 'Other', description: 'Literal percent sign', example: '%' }
    ]
  },
  {
    id: 'dotnet',
    name: '.NET / C#',
    icon: '🔷',
    ecosystem: 'C#, .NET, ASP.NET, PowerShell, F#',
    aliases: ['csharp', '.net', 'c#'],
    syntaxNote: "Wrap literal text in single or double quotes: 'Date: ' yyyy-MM-dd. Escaped backslash: \\.",
    sampleParse: "Tempo.fromFormat('2026-10-24 15:30:45.123', 'yyyy-MM-dd HH:mm:ss.fff', { dialect: 'dotnet' })",
    sampleFormat: "t.format('dddd, MMMM d, yyyy HH:mm:ss K', { dialect: 'dotnet' })",
    tokens: [
      { external: 'yyyy / yyyyy', tempo: '{yyyy}', category: 'Year', description: '4-digit calendar year', example: '2026' },
      { external: 'yy', tempo: '{yy}', category: 'Year', description: '2-digit year (00–99)', example: '26' },
      { external: 'y', tempo: '{yyyy}', category: 'Year', description: 'Calendar year without zero-padding', example: '2026' },
      { external: 'MM', tempo: '{mm}', category: 'Month', description: 'Zero-padded month (01–12)', example: '10' },
      { external: 'M', tempo: '{mm:raw}', category: 'Month', description: 'Unpadded month (1–12)', example: '10' },
      { external: 'MMM', tempo: '{mmm}', category: 'Month', description: 'Abbreviated month name', example: 'Oct' },
      { external: 'MMMM', tempo: '{mon}', category: 'Month', description: 'Full month name', example: 'October' },
      { external: 'dd', tempo: '{dd}', category: 'Day', description: 'Zero-padded day of month (01–31)', example: '24' },
      { external: 'd', tempo: '{dd:raw}', category: 'Day', description: 'Unpadded day of month (1–31)', example: '24' },
      { external: 'ddd', tempo: '{www}', category: 'Weekday', description: 'Abbreviated weekday name', example: 'Sat' },
      { external: 'dddd', tempo: '{wkd}', category: 'Weekday', description: 'Full weekday name', example: 'Saturday' },
      { external: 'HH', tempo: '{hh}', category: 'Hour', description: 'Zero-padded 24-hour (00–23)', example: '15' },
      { external: 'H', tempo: '{hh:raw}', category: 'Hour', description: 'Unpadded 24-hour (0–23)', example: '15' },
      { external: 'hh', tempo: '{h12}', category: 'Hour', description: 'Zero-padded 12-hour (01–12)', example: '03' },
      { external: 'h', tempo: '{h12:raw}', category: 'Hour', description: 'Unpadded 12-hour (1–12)', example: '3' },
      { external: 'mm', tempo: '{mi}', category: 'Minute', description: 'Zero-padded minute (00–59)', example: '30' },
      { external: 'm', tempo: '{mi:raw}', category: 'Minute', description: 'Unpadded minute (0–59)', example: '30' },
      { external: 'ss', tempo: '{ss}', category: 'Second', description: 'Zero-padded second (00–59)', example: '45' },
      { external: 's', tempo: '{ss:raw}', category: 'Second', description: 'Unpadded second (0–59)', example: '45' },
      { external: 'fff', tempo: '{ms}', category: 'Fractional', description: 'Milliseconds (3 digits)', example: '123' },
      { external: 'ffffff', tempo: '{ff:6}', category: 'Fractional', description: 'Microseconds (6 digits)', example: '123456' },
      { external: 'fffffff', tempo: '{ff:7}', category: 'Fractional', description: '100-nanosecond ticks (7 digits)', example: '1234567' },
      { external: 'tt', tempo: '{mer:upper}', category: 'Hour', description: 'AM / PM designator', example: 'PM' },
      { external: 't', tempo: '{mer:initial}', category: 'Hour', description: 'First letter of AM / PM designator', example: 'P' },
      { external: 'zzz', tempo: '{tz:offset}', category: 'Timezone', description: 'Hours and minutes offset with colon', example: '+08:00' },
      { external: 'zz', tempo: '{tz:offsethours}', category: 'Timezone', description: 'Zero-padded hours offset', example: '+08' },
      { external: 'z', tempo: '{tz:offsethours:raw}', category: 'Timezone', description: 'Unpadded hours offset', example: '+8' },
      { external: 'K', tempo: '{tz:offset}', category: 'Timezone', description: 'ISO 8601 offset representation', example: '+08:00' },
      { external: 'O / o', tempo: 'Round-trip', category: 'Other', description: 'Standard Round-trip ISO-8601 specifier', example: '2026-10-24T15:30:45.1234567+08:00' },
      { external: 's', tempo: 'Sortable', category: 'Other', description: 'Standard Sortable ISO specifier', example: '2026-10-24T15:30:45' },
      { external: 'u', tempo: 'Universal', category: 'Other', description: 'Universal sortable pattern', example: '2026-10-24 15:30:45Z' },
      { external: 'r / R', tempo: 'RFC 1123', category: 'Other', description: 'RFC 1123 format specifier', example: 'Sat, 24 Oct 2026 15:30:45 GMT' }
    ]
  },
  {
    id: 'sheet',
    name: 'Excel / Sheets',
    icon: '📊',
    ecosystem: 'Microsoft Excel, Google Sheets, LibreOffice Calc, OpenDocument Spreadsheet',
    aliases: ['spreadsheet', 'excel', 'sheets'],
    syntaxNote: 'Wrap literal text in double quotes: "Date: " yyyy-mm-dd. Token mm is month by default, or minute when immediately near h or s.',
    sampleParse: "Tempo.fromFormat('24/10/2026 15:30:45', 'dd/mm/yyyy hh:mm:ss', { dialect: 'sheet' })",
    sampleFormat: "t.format('mmmm d, yyyy hh:mm:ss AM/PM', { dialect: 'sheet' })",
    tokens: [
      { external: 'yyyy', tempo: '{yyyy}', category: 'Year', description: '4-digit calendar year', example: '2026' },
      { external: 'yy', tempo: '{yy}', category: 'Year', description: '2-digit year (00–99)', example: '26' },
      { external: 'mm (date)', tempo: '{mm}', category: 'Month', description: 'Zero-padded month (01–12) in date context', example: '10' },
      { external: 'm (date)', tempo: '{mm:raw}', category: 'Month', description: 'Unpadded month (1–12) in date context', example: '10' },
      { external: 'mmm', tempo: '{mmm}', category: 'Month', description: 'Abbreviated month name', example: 'Oct' },
      { external: 'mmmm', tempo: '{mon}', category: 'Month', description: 'Full month name', example: 'October' },
      { external: 'mmmmm', tempo: '{mon:initial}', category: 'Month', description: 'Single letter month initial', example: 'O' },
      { external: 'dd', tempo: '{dd}', category: 'Day', description: 'Zero-padded day of month (01–31)', example: '24' },
      { external: 'd', tempo: '{dd:raw}', category: 'Day', description: 'Unpadded day of month (1–31)', example: '24' },
      { external: 'ddd', tempo: '{www}', category: 'Weekday', description: 'Abbreviated weekday name', example: 'Sat' },
      { external: 'dddd', tempo: '{wkd}', category: 'Weekday', description: 'Full weekday name', example: 'Saturday' },
      { external: 'hh', tempo: '{h12} / {hh}', category: 'Hour', description: 'Zero-padded hour (12h if AM/PM present, else 24h)', example: '03' },
      { external: 'h', tempo: '{h12:raw} / {hh:raw}', category: 'Hour', description: 'Unpadded hour (12h if AM/PM present, else 24h)', example: '3' },
      { external: 'mm (time)', tempo: '{mi}', category: 'Minute', description: 'Zero-padded minute (00–59) after hour or before second', example: '30' },
      { external: 'm (time)', tempo: '{mi:raw}', category: 'Minute', description: 'Unpadded minute (0–59) after hour or before second', example: '30' },
      { external: 'ss', tempo: '{ss}', category: 'Second', description: 'Zero-padded second (00–59)', example: '45' },
      { external: 's', tempo: '{ss:raw}', category: 'Second', description: 'Unpadded second (0–59)', example: '45' },
      { external: '.000', tempo: '{ms}', category: 'Fractional', description: 'Milliseconds (3 decimal places)', example: '.123' },
      { external: '.00', tempo: '{ff:2}', category: 'Fractional', description: 'Hundredths of a second (2 decimal places)', example: '.12' },
      { external: '.0', tempo: '{ff:1}', category: 'Fractional', description: 'Tenths of a second (1 decimal place)', example: '.1' },
      { external: 'AM/PM', tempo: '{mer:upper}', category: 'Hour', description: 'Uppercase AM/PM indicator', example: 'PM' },
      { external: 'am/pm', tempo: '{mer}', category: 'Hour', description: 'Lowercase am/pm indicator', example: 'pm' },
      { external: 'A/P', tempo: '{mer:initial}', category: 'Hour', description: 'Single letter uppercase A or P', example: 'P' },
      { external: 'a/p', tempo: '{mer:initial:lower}', category: 'Hour', description: 'Single letter lowercase a or p', example: 'p' },
      { external: '[h] / [m] / [s]', tempo: 'Duration', category: 'Other', description: 'Cumulative elapsed hours, minutes, or seconds', example: '[36]' }
    ]
  },
  {
    id: 'mysql',
    name: 'MySQL / MariaDB',
    icon: '🐬',
    ecosystem: 'MySQL, MariaDB (DATE_FORMAT & STR_TO_DATE)',
    aliases: ['mariadb'],
    syntaxNote: 'All specifiers are prefixed with %. Literal text does not require escaping. Use %% for a literal percent sign.',
    sampleParse: "Tempo.fromFormat('2026-10-24 15:30:45', '%Y-%m-%d %H:%i:%s', { dialect: 'mysql' })",
    sampleFormat: "t.format('%W, %M %e, %Y at %r', { dialect: 'mysql' })",
    tokens: [
      { external: '%Y', tempo: '{yyyy}', category: 'Year', description: '4-digit calendar year', example: '2026' },
      { external: '%y', tempo: '{yy}', category: 'Year', description: '2-digit calendar year (00–99)', example: '26' },
      { external: '%X / %x', tempo: '{yow}', category: 'Year', description: '4-digit week-based year', example: '2026' },
      { external: '%m', tempo: '{mm}', category: 'Month', description: 'Zero-padded month (01–12)', example: '10' },
      { external: '%c', tempo: '{mm:raw}', category: 'Month', description: 'Unpadded month (1–12)', example: '10' },
      { external: '%b', tempo: '{mmm}', category: 'Month', description: 'Abbreviated month name', example: 'Oct' },
      { external: '%M', tempo: '{mon}', category: 'Month', description: 'Full month name', example: 'October' },
      { external: '%d', tempo: '{dd}', category: 'Day', description: 'Zero-padded day of month (01–31)', example: '24' },
      { external: '%e', tempo: '{dd:raw}', category: 'Day', description: 'Unpadded day of month (1–31)', example: '24' },
      { external: '%D', tempo: '{dd:ord}', category: 'Day', description: 'Day of month with English suffix', example: '24th' },
      { external: '%j', tempo: '{doy}', category: 'Day', description: 'Zero-padded day of year (001–366)', example: '297' },
      { external: '%v / %u / %U / %V', tempo: '{woy}', category: 'Week', description: 'Week of year (01–53)', example: '43' },
      { external: '%W', tempo: '{wkd}', category: 'Weekday', description: 'Full weekday name', example: 'Saturday' },
      { external: '%a', tempo: '{www}', category: 'Weekday', description: 'Abbreviated weekday name', example: 'Sat' },
      { external: '%w', tempo: '{dow:0}', category: 'Weekday', description: 'Day of week (0=Sunday..6=Saturday)', example: '6' },
      { external: '%H', tempo: '{hh}', category: 'Hour', description: 'Zero-padded 24-hour (00–23)', example: '15' },
      { external: '%k', tempo: '{hh:raw}', category: 'Hour', description: 'Unpadded 24-hour (0–23)', example: '15' },
      { external: '%h / %I', tempo: '{h12}', category: 'Hour', description: 'Zero-padded 12-hour (01–12)', example: '03' },
      { external: '%l', tempo: '{h12:raw}', category: 'Hour', description: 'Unpadded 12-hour (1–12)', example: '3' },
      { external: '%i', tempo: '{mi}', category: 'Minute', description: 'Zero-padded minute (00–59)', example: '30' },
      { external: '%s / %S', tempo: '{ss}', category: 'Second', description: 'Zero-padded second (00–59)', example: '45' },
      { external: '%f', tempo: '{ff:6}', category: 'Fractional', description: 'Microseconds (6 digits)', example: '123456' },
      { external: '%p', tempo: '{mer:upper}', category: 'Hour', description: 'AM or PM meridiem', example: 'PM' },
      { external: '%r', tempo: '{h12}:{mi}:{ss} {mer:upper}', category: 'Other', description: '12-hour time format with AM/PM', example: '03:30:45 PM' },
      { external: '%T', tempo: '{hh}:{mi}:{ss}', category: 'Other', description: '24-hour time format', example: '15:30:45' },
      { external: '%%', tempo: '%', category: 'Other', description: 'Literal percent sign', example: '%' }
    ]
  },
  {
    id: 'oracle',
    name: 'Oracle / PostgreSQL',
    icon: '🏛️',
    ecosystem: 'Oracle Database, PostgreSQL, Snowflake, Amazon Redshift (TO_CHAR / TO_DATE)',
    aliases: ['sql', 'postgres', 'postgresql', 'snowflake', 'redshift', 'to_char', 'tochar'],
    syntaxNote: 'Tokens are case-insensitive. Prefix with FM to suppress zero-padding or trailing spaces.',
    sampleParse: "Tempo.fromFormat('2026-10-24 15:30:45', 'YYYY-MM-DD HH24:MI:SS', { dialect: 'oracle' })",
    sampleFormat: "t.format('Day, Month DD, YYYY at HH12:MI:SS AM', { dialect: 'oracle' })",
    tokens: [
      { external: 'YYYY / RRRR', tempo: '{yyyy}', category: 'Year', description: '4-digit year', example: '2026' },
      { external: 'YY / RR', tempo: '{yy}', category: 'Year', description: '2-digit year (00–99)', example: '26' },
      { external: 'IYYY', tempo: '{yow}', category: 'Year', description: '4-digit ISO week-numbering year', example: '2026' },
      { external: 'IY', tempo: '{yow:2}', category: 'Year', description: '2-digit ISO week-numbering year', example: '26' },
      { external: 'MM', tempo: '{mm}', category: 'Month', description: 'Zero-padded month (01–12)', example: '10' },
      { external: 'FMMM', tempo: '{mm:raw}', category: 'Month', description: 'Unpadded month (1–12)', example: '10' },
      { external: 'MON / Mon / mon', tempo: '{mmm}', category: 'Month', description: 'Abbreviated month name (case-preserving)', example: 'Oct' },
      { external: 'MONTH / Month / month', tempo: '{mon}', category: 'Month', description: 'Full month name (case-preserving)', example: 'October' },
      { external: 'DD', tempo: '{dd}', category: 'Day', description: 'Zero-padded day of month (01–31)', example: '24' },
      { external: 'FMDD', tempo: '{dd:raw}', category: 'Day', description: 'Unpadded day of month (1–31)', example: '24' },
      { external: 'DDD', tempo: '{doy}', category: 'Day', description: 'Zero-padded day of year (001–366)', example: '297' },
      { external: 'IW', tempo: '{woy}', category: 'Week', description: 'ISO week number (01–53)', example: '43' },
      { external: 'DAY / Day / day', tempo: '{wkd}', category: 'Weekday', description: 'Full weekday name (case-preserving)', example: 'Saturday' },
      { external: 'DY / Dy / dy', tempo: '{www}', category: 'Weekday', description: 'Abbreviated weekday name (case-preserving)', example: 'Sat' },
      { external: 'D', tempo: '{dow}', category: 'Weekday', description: 'Numeric day of week', example: '6' },
      { external: 'HH24', tempo: '{hh}', category: 'Hour', description: 'Zero-padded 24-hour (00–23)', example: '15' },
      { external: 'FMHH24', tempo: '{hh:raw}', category: 'Hour', description: 'Unpadded 24-hour (0–23)', example: '15' },
      { external: 'HH / HH12', tempo: '{h12}', category: 'Hour', description: 'Zero-padded 12-hour (01–12)', example: '03' },
      { external: 'FMHH12', tempo: '{h12:raw}', category: 'Hour', description: 'Unpadded 12-hour (1–12)', example: '3' },
      { external: 'MI', tempo: '{mi}', category: 'Minute', description: 'Zero-padded minute (00–59)', example: '30' },
      { external: 'FMMI', tempo: '{mi:raw}', category: 'Minute', description: 'Unpadded minute (0–59)', example: '30' },
      { external: 'SS', tempo: '{ss}', category: 'Second', description: 'Zero-padded second (00–59)', example: '45' },
      { external: 'FMSS', tempo: '{ss:raw}', category: 'Second', description: 'Unpadded second (0–59)', example: '45' },
      { external: 'FF3', tempo: '{ms}', category: 'Fractional', description: 'Milliseconds (3 digits)', example: '123' },
      { external: 'FF6', tempo: '{ff:6}', category: 'Fractional', description: 'Microseconds (6 digits)', example: '123456' },
      { external: 'FF9', tempo: '{ff:9}', category: 'Fractional', description: 'Nanoseconds (9 digits)', example: '123456789' },
      { external: 'AM / PM', tempo: '{mer:upper}', category: 'Hour', description: 'Uppercase meridiem indicator', example: 'PM' },
      { external: 'am / pm', tempo: '{mer}', category: 'Hour', description: 'Lowercase meridiem indicator', example: 'pm' },
      { external: 'TZD', tempo: '{tz:short}', category: 'Timezone', description: 'Daylight savings abbreviation', example: 'EDT' },
      { external: 'TZH:TZM', tempo: '{tz:offset}', category: 'Timezone', description: 'Time zone offset with colon', example: '+08:00' },
      { external: 'OF', tempo: '{tz:offsetcompact}', category: 'Timezone', description: 'Compact offset without colon', example: '+0800' }
    ]
  },
  {
    id: 'php',
    name: 'PHP date()',
    icon: '🐘',
    ecosystem: 'PHP, Laravel, WordPress, Symfony',
    aliases: ['laravel', 'wordpress'],
    syntaxNote: 'Single letters represent tokens; backslash-escape any character to treat as literal: \\d\\a\\t\\e.',
    sampleParse: "Tempo.fromFormat('2026-10-24 15:30:45', 'Y-m-d H:i:s', { dialect: 'php' })",
    sampleFormat: "t.format('l, F jS, Y \\a\\t g:i:s A', { dialect: 'php' })",
    tokens: [
      { external: 'Y', tempo: '{yyyy}', category: 'Year', description: '4-digit calendar year', example: '2026' },
      { external: 'y', tempo: '{yy}', category: 'Year', description: '2-digit year (00–99)', example: '26' },
      { external: 'o', tempo: '{yow}', category: 'Year', description: '4-digit ISO week-numbering year', example: '2026' },
      { external: 'm', tempo: '{mm}', category: 'Month', description: 'Zero-padded month (01–12)', example: '10' },
      { external: 'n', tempo: '{mm:raw}', category: 'Month', description: 'Unpadded month (1–12)', example: '10' },
      { external: 'M', tempo: '{mmm}', category: 'Month', description: 'Abbreviated month name', example: 'Oct' },
      { external: 'F', tempo: '{mon}', category: 'Month', description: 'Full month name', example: 'October' },
      { external: 'd', tempo: '{dd}', category: 'Day', description: 'Zero-padded day of month (01–31)', example: '24' },
      { external: 'j', tempo: '{dd:raw}', category: 'Day', description: 'Unpadded day of month (1–31)', example: '24' },
      { external: 'jS', tempo: '{dd:ord}', category: 'Day', description: 'Day of month with English ordinal suffix', example: '24th' },
      { external: 'z', tempo: '{doy:0}', category: 'Day', description: 'Day of year (0-indexed: 0–365)', example: '296' },
      { external: 'W', tempo: '{woy}', category: 'Week', description: 'ISO week number (01–53)', example: '43' },
      { external: 'l', tempo: '{wkd}', category: 'Weekday', description: 'Full weekday name', example: 'Saturday' },
      { external: 'D', tempo: '{www}', category: 'Weekday', description: 'Abbreviated weekday name', example: 'Sat' },
      { external: 'N', tempo: '{dow}', category: 'Weekday', description: 'ISO-8601 day of week (1=Monday..7=Sunday)', example: '6' },
      { external: 'w', tempo: '{dow:0}', category: 'Weekday', description: 'Day of week (0=Sunday..6=Saturday)', example: '6' },
      { external: 'H', tempo: '{hh}', category: 'Hour', description: 'Zero-padded 24-hour (00–23)', example: '15' },
      { external: 'G', tempo: '{hh:raw}', category: 'Hour', description: 'Unpadded 24-hour (0–23)', example: '15' },
      { external: 'h', tempo: '{h12}', category: 'Hour', description: 'Zero-padded 12-hour (01–12)', example: '03' },
      { external: 'g', tempo: '{h12:raw}', category: 'Hour', description: 'Unpadded 12-hour (1–12)', example: '3' },
      { external: 'i', tempo: '{mi}', category: 'Minute', description: 'Zero-padded minute (00–59)', example: '30' },
      { external: 's', tempo: '{ss}', category: 'Second', description: 'Zero-padded second (00–59)', example: '45' },
      { external: 'v', tempo: '{ms}', category: 'Fractional', description: 'Milliseconds (3 digits)', example: '123' },
      { external: 'u', tempo: '{ff:6}', category: 'Fractional', description: 'Microseconds (6 digits)', example: '123456' },
      { external: 'A', tempo: '{mer:upper}', category: 'Hour', description: 'Uppercase meridiem (AM / PM)', example: 'PM' },
      { external: 'a', tempo: '{mer}', category: 'Hour', description: 'Lowercase meridiem (am / pm)', example: 'pm' },
      { external: 'T', tempo: '{tz:short}', category: 'Timezone', description: 'Timezone abbreviation', example: 'EDT' },
      { external: 'P', tempo: '{tz:offset}', category: 'Timezone', description: 'Difference to Greenwich time with colon', example: '+08:00' },
      { external: 'O', tempo: '{tz:offsetcompact}', category: 'Timezone', description: 'Difference to Greenwich time without colon', example: '+0800' },
      { external: 'U', tempo: '{ts}', category: 'Epoch', description: 'Seconds since Unix Epoch', example: '1792848645' }
    ]
  },
  {
    id: 'go',
    name: 'Go (time.Format)',
    icon: '🐹',
    ecosystem: 'Go standard library (time package)',
    aliases: ['golang'],
    syntaxNote: 'Go defines layouts via reference timestamp: Mon Jan 2 15:04:05 MST 2006. Standard characters outside reference layouts remain literal.',
    sampleParse: "Tempo.fromFormat('2026-10-24 15:30:45', '2006-01-02 15:04:05', { dialect: 'go' })",
    sampleFormat: "t.format('Monday, January 2, 2006 at 3:04:05 PM MST', { dialect: 'go' })",
    tokens: [
      { external: '2006', tempo: '{yyyy}', category: 'Year', description: '4-digit calendar year', example: '2026' },
      { external: '06', tempo: '{yy}', category: 'Year', description: '2-digit year (00–99)', example: '26' },
      { external: '01', tempo: '{mm}', category: 'Month', description: 'Zero-padded month (01–12)', example: '10' },
      { external: '1', tempo: '{mm:raw}', category: 'Month', description: 'Unpadded month (1–12)', example: '10' },
      { external: 'Jan', tempo: '{mmm}', category: 'Month', description: 'Abbreviated month name', example: 'Oct' },
      { external: 'January', tempo: '{mon}', category: 'Month', description: 'Full month name', example: 'October' },
      { external: '02', tempo: '{dd}', category: 'Day', description: 'Zero-padded day of month (01–31)', example: '24' },
      { external: '2', tempo: '{dd:raw}', category: 'Day', description: 'Unpadded day of month (1–31)', example: '24' },
      { external: '_2', tempo: '{dd:space}', category: 'Day', description: 'Space-padded day of month ( 1–31)', example: '24' },
      { external: '002', tempo: '{doy}', category: 'Day', description: 'Zero-padded day of year (001–366)', example: '297' },
      { external: 'Monday', tempo: '{wkd}', category: 'Weekday', description: 'Full weekday name', example: 'Saturday' },
      { external: 'Mon', tempo: '{www}', category: 'Weekday', description: 'Abbreviated weekday name', example: 'Sat' },
      { external: '15', tempo: '{hh}', category: 'Hour', description: 'Zero-padded 24-hour (00–23)', example: '15' },
      { external: '03', tempo: '{h12}', category: 'Hour', description: 'Zero-padded 12-hour (01–12)', example: '03' },
      { external: '3', tempo: '{h12:raw}', category: 'Hour', description: 'Unpadded 12-hour (1–12)', example: '3' },
      { external: '04', tempo: '{mi}', category: 'Minute', description: 'Zero-padded minute (00–59)', example: '30' },
      { external: '4', tempo: '{mi:raw}', category: 'Minute', description: 'Unpadded minute (0–59)', example: '30' },
      { external: '05', tempo: '{ss}', category: 'Second', description: 'Zero-padded second (00–59)', example: '45' },
      { external: '5', tempo: '{ss:raw}', category: 'Second', description: 'Unpadded second (0–59)', example: '45' },
      { external: '.000 / .999', tempo: '{ms}', category: 'Fractional', description: 'Milliseconds (3 digits)', example: '.123' },
      { external: '.000000 / .999999', tempo: '{ff:6}', category: 'Fractional', description: 'Microseconds (6 digits)', example: '.123456' },
      { external: '.000000000 / .999999999', tempo: '{ff:9}', category: 'Fractional', description: 'Nanoseconds (9 digits)', example: '.123456789' },
      { external: 'PM', tempo: '{mer:upper}', category: 'Hour', description: 'Uppercase meridiem (AM / PM)', example: 'PM' },
      { external: 'pm', tempo: '{mer}', category: 'Hour', description: 'Lowercase meridiem (am / pm)', example: 'pm' },
      { external: 'MST', tempo: '{tz:short}', category: 'Timezone', description: 'Timezone abbreviation', example: 'EDT' },
      { external: '-07:00', tempo: '{tz:offset}', category: 'Timezone', description: 'ISO 8601 offset with colon', example: '+08:00' },
      { external: '-0700', tempo: '{tz:offsetcompact}', category: 'Timezone', description: 'Compact offset without colon', example: '+0800' }
    ]
  }
];

const selectedDialectId = ref<string>('dotnet');
const searchQuery = ref<string>('');
const copiedToken = ref<string | null>(null);

const activeDialect = computed(() => {
  return DIALECTS.find((d) => d.id === selectedDialectId.value) || DIALECTS[0];
});

const filteredTokens = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  const tokens = activeDialect.value.tokens;
  if (!query) return tokens;

  return tokens.filter((t) => {
    return (
      t.external.toLowerCase().includes(query) ||
      t.tempo.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.example.toLowerCase().includes(query)
    );
  });
});

function selectDialect(id: string) {
  selectedDialectId.value = id;
}

function copyToClipboard(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      copiedToken.value = text;
      setTimeout(() => {
        if (copiedToken.value === text) {
          copiedToken.value = null;
        }
      }, 1800);
    }).catch(() => {});
  }
}
</script>

<template>
  <div class="dialect-tabs-wrapper">
    <!-- 1. Dialect Selection Nav Bar -->
    <div class="dialect-nav" role="tablist" aria-label="Dialect Selection">
      <button
        v-for="d in DIALECTS"
        :key="d.id"
        class="dialect-tab-btn"
        :class="{ 'is-active': selectedDialectId === d.id }"
        role="tab"
        :aria-selected="selectedDialectId === d.id"
        @click="selectDialect(d.id)"
      >
        <span class="tab-icon">{{ d.icon }}</span>
        <span class="tab-name">{{ d.name }}</span>
      </button>
    </div>

    <!-- 2. Active Dialect Header Banner -->
    <div class="dialect-banner">
      <div class="dialect-banner-main">
        <div class="dialect-title-row">
          <span class="banner-icon">{{ activeDialect.icon }}</span>
          <h3 class="banner-title">{{ activeDialect.name }}</h3>
          <span class="banner-badge">dialect: '{{ activeDialect.id }}'</span>
        </div>
        <p class="banner-ecosystem"><strong>Primary Ecosystems:</strong> {{ activeDialect.ecosystem }}</p>
        <div class="banner-syntax">
          <span class="syntax-icon">💡</span>
          <span class="syntax-text">{{ activeDialect.syntaxNote }}</span>
        </div>
      </div>

      <!-- Live Code Quick Sample -->
      <div class="dialect-sample-card">
        <div class="sample-header">
          <span class="sample-label">TypeScript Quick Example</span>
          <button class="sample-copy-btn" @click="copyToClipboard(activeDialect.sampleFormat)">
            {{ copiedToken === activeDialect.sampleFormat ? '✓ Copied' : 'Copy' }}
          </button>
        </div>
        <div class="sample-body">
          <code>// Parse:</code>
          <code>{{ activeDialect.sampleParse }}</code>
          <code>// Format:</code>
          <code>{{ activeDialect.sampleFormat }}</code>
        </div>
      </div>
    </div>

    <!-- 3. Token Search and Count Bar -->
    <div class="dialect-toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Filter tokens by name, category, or Tempo tag (e.g. year, hour, ord, {ms})..."
          aria-label="Filter tokens"
        />
        <button v-if="searchQuery" class="clear-btn" title="Clear filter" @click="searchQuery = ''">✕</button>
      </div>
      <div class="token-count">
        Showing <strong>{{ filteredTokens.length }}</strong> of {{ activeDialect.tokens.length }} tokens
      </div>
    </div>

    <!-- 4. Focused Token Mapping Table -->
    <div class="dialect-table-container">
      <table class="dialect-token-table">
        <thead>
          <tr>
            <th class="col-ext">{{ activeDialect.name }} Token</th>
            <th class="col-tempo">Native Tempo Equivalent</th>
            <th class="col-cat">Category</th>
            <th class="col-desc">Description & Output Sample</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in filteredTokens" :key="t.external + t.tempo">
            <td class="col-ext">
              <span class="token-pill token-ext">{{ t.external }}</span>
            </td>
            <td class="col-tempo">
              <button
                class="token-tempo-btn"
                :title="'Click to copy ' + t.tempo"
                @click="copyToClipboard(t.tempo)"
              >
                <code>{{ t.tempo }}</code>
                <span class="copy-hint">{{ copiedToken === t.tempo ? '✓ Copied!' : 'Copy' }}</span>
              </button>
            </td>
            <td class="col-cat">
              <span class="cat-pill" :data-cat="t.category">{{ t.category }}</span>
            </td>
            <td class="col-desc">
              <div class="desc-text">{{ t.description }}</div>
              <div class="example-text">Sample: <code>{{ t.example }}</code></div>
              <div v-if="t.notes" class="notes-text">{{ t.notes }}</div>
            </td>
          </tr>
          <tr v-if="filteredTokens.length === 0">
            <td colspan="4" class="no-tokens-found">
              No matching tokens found for "{{ searchQuery }}". Try searching for "year", "hour", "day", or clear the filter.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.dialect-tabs-wrapper {
  margin: 1.5rem 0 2.5rem;
  border-radius: 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

/* Nav Bar */
.dialect-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
}

.dialect-tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;
  user-select: none;
}

.dialect-tab-btn:hover {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-soft);
}

.dialect-tab-btn.is-active {
  background: var(--vp-c-bg);
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tab-icon {
  font-size: 1rem;
}

/* Banner */
.dialect-banner {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  padding: 16px 20px;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
}

@media (min-width: 900px) {
  .dialect-banner {
    grid-template-columns: 1.2fr 1fr;
    align-items: center;
  }
}

.dialect-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.banner-icon {
  font-size: 1.5rem;
}

.banner-title {
  margin: 0 !important;
  font-size: 1.3rem !important;
  font-weight: 700;
  color: var(--vp-c-text-1);
  border: none !important;
  padding: 0 !important;
}

.banner-badge {
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.banner-ecosystem {
  font-size: 0.88rem;
  color: var(--vp-c-text-2);
  margin: 4px 0 8px 0;
}

.banner-syntax {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  font-size: 0.85rem;
  color: var(--vp-c-text-1);
  border-left: 3px solid var(--vp-c-brand-1);
}

.syntax-icon {
  font-size: 0.95rem;
}

/* Sample Card */
.dialect-sample-card {
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
  border: 1px solid var(--vp-c-divider);
  overflow: hidden;
}

.sample-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.sample-copy-btn {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.74rem;
  color: var(--vp-c-brand-1);
  cursor: pointer;
  transition: all 0.15s ease;
}

.sample-copy-btn:hover {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
}

.sample-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sample-body code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  background: transparent;
  padding: 0;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow-x: auto;
}

.sample-body code:first-child,
.sample-body code:nth-child(3) {
  color: var(--vp-c-text-3);
  font-weight: 600;
}

/* Toolbar */
.dialect-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 280px;
  max-width: 520px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 6px 32px 6px 32px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px var(--vp-c-brand-soft);
}

.clear-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--vp-c-text-3);
  font-size: 0.75rem;
  cursor: pointer;
}

.token-count {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
}

/* Table */
.dialect-table-container {
  overflow-x: auto;
}

.dialect-token-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  margin: 0 !important;
}

.dialect-token-table th {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-weight: 600;
  text-align: left;
  padding: 10px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.dialect-token-table td {
  padding: 10px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  vertical-align: middle;
}

.dialect-token-table tr:last-child td {
  border-bottom: none;
}

.dialect-token-table tr:hover td {
  background: var(--vp-c-bg-alt);
}

.col-ext {
  width: 18%;
  min-width: 130px;
}

.col-tempo {
  width: 22%;
  min-width: 160px;
}

.col-cat {
  width: 14%;
  min-width: 100px;
}

.col-desc {
  width: 46%;
}

.token-pill {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 5px;
  font-family: var(--vp-font-family-mono);
  font-size: 0.84rem;
  font-weight: 600;
}

.token-ext {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-brand-1);
}

.token-tempo-btn {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 6px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-brand-soft);
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: var(--vp-font-family-mono);
  font-size: 0.84rem;
  width: 100%;
  max-width: 180px;
}

.token-tempo-btn:hover {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.token-tempo-btn code {
  background: transparent !important;
  padding: 0 !important;
  color: var(--vp-c-brand-1) !important;
  font-weight: 700;
}

.copy-hint {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
}

.token-tempo-btn:hover .copy-hint {
  color: var(--vp-c-brand-1);
}

.cat-pill {
  display: inline-block;
  font-size: 0.74rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}

.desc-text {
  font-weight: 500;
  color: var(--vp-c-text-1);
  margin-bottom: 2px;
}

.example-text {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.example-text code {
  font-family: var(--vp-font-family-mono);
  font-size: 0.78rem;
  padding: 1px 4px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}

.notes-text {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  margin-top: 2px;
  font-style: italic;
}

.no-tokens-found {
  text-align: center;
  padding: 2rem !important;
  color: var(--vp-c-text-2);
  font-style: italic;
}
</style>
