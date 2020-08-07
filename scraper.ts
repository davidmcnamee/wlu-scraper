import axios, { AxiosRequestConfig } from 'axios';
const BASE_URL = 'https://loris.wlu.ca/register/ssb/searchResults/searchResults';

enum TermNum {
  // SPRING_2021 = "202105",
  // WINTER_2021 = "202101",
  // FALL_2020 = "202009",
  SPRING_2020 = "202005",
  WINTER_2020 = "202001",
  FALL_2019 = "201909",
};

type WLUResponse = {
  success: boolean;
  data: Array<{
    totalCount: number;
    term: string;
    subject: string;
    courseNumber: string;
  }>;
};

const delayGenerator = (count: number): number[] => {
  const MIN_DELAY = 8000;
  const MAX_DELAY = 16000;
  const res = [0];
  --count;
  while (count > 0) {
    const rand = Math.random();
    res.push(res[res.length - 1] + (1 - rand * rand) * (MAX_DELAY - MIN_DELAY) + MIN_DELAY);
    count--;
  }
  return res;
}

type Scrape = {
  (a: { subject: string, courseNum: string, termStr: string, cookie: string }): Promise<any[]>,
};

const scrape: Scrape = async ({ subject, courseNum, termStr, cookie }) => {
  var config: AxiosRequestConfig = {
    method: 'get',
    url: `${BASE_URL}?txt_subject=${subject}&txt_courseNumber=${courseNum}&txt_term=${termStr}&startDatepicker=&endDatepicker=&pageOffset=0&pageMaxSize=50&sortColumn=subjectDescription&sortDirection=asc`,
    headers: {
      'Connection': 'keep-alive',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Dest': 'empty',
      'Referer': 'https://loris.wlu.ca/register/ssb/classSearch/classSearch',
      'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
      'Cookie': cookie
    }
  };
  const { data } = await axios(config) as { data: WLUResponse };
  if (!data.success) throw Error('unsuccessful response');
  return data.data.filter(d => {
    // make sure it matches the input, because sometimes it returns fuzzy results
    return d.courseNumber === courseNum || d.subject === subject || d.term === termStr;
  });
}

type PrintCourseAvailability = {
  (a: { subject: string, courseNum: string, cookie: string }): Promise<void>;
};

let ERROR_COUNT = 0;

const printCourseAvailabilit: PrintCourseAvailability = async ({ subject, courseNum, cookie }) => {
  const delays = delayGenerator(Object.keys(TermNum).length);

  const availabilityObj = {
    "F": false,
    "W": false,
    "S": false,
  };

  return new Promise((resolve) => {
    Object.keys(TermNum).map((term, i) => {
      const myFunc = async (t: string) => {
        const termStr = TermNum[t];
        let results: string | number = "";
        try {
          const arr = await scrape({ subject, courseNum, termStr, cookie });
          results = arr.length ? "offered" : "not offered";
          if (arr.length > 0) {
            if (t.includes("FALL")) availabilityObj["F"] = true;
            if (t.includes("WINTER")) availabilityObj["W"] = true;
            if (t.includes("SPRING")) availabilityObj["S"] = true;
          } else {
            ERROR_COUNT++;
            if (ERROR_COUNT > 3) {
              process.exit();
            }
          }
        } catch (err) {
          results = 'error';
          ERROR_COUNT++;
          if (ERROR_COUNT > 3) {
            process.exit();
          }
        }
        console.log(`${t}\t${results}`);
        if (i == Object.keys(TermNum).length - 1) {
          const availabilityArr = Object.entries(availabilityObj).filter(([_, b]) => b).map(([t]) => t);
          console.log(`${subject}${courseNum}: [${availabilityArr.join(",")}]`);
          resolve();
        }
      }
      setTimeout(() => myFunc(term), delays[i]);
    });
  });
}


// INPUT GOES HERE

const COOKIE = `-------->>>COOKIE_GOES_HERE<<<------`;

const COURSES = ['BU443', 'BU445', 'BU447', 'BU448', 'BU449', 'BU451', 'BU452', 'BU453', 'BU455', 'BU459', 'BU460', 'BU461', 'BU462', 'BU463', 'BU464', 'BU466', 'BU467', 'BU468', 'BU469', 'BU470', 'BU471', 'BU472', 'BU473', 'BU474', 'BU477', 'BU479', 'BU480', 'BU481', 'BU482', 'BU483', 'BU485', 'BU486', 'BU487', 'BU488', 'BU489', 'BU490', 'BU491', 'BU492', 'BU493', 'BU495', 'BU496', 'BU497', 'BU498', 'BU499', 'ENTR100', 'ENTR200', 'ENTR300', 'ENTR301', 'ENTR310', 'ENTR480'];

const promiseGenerators = COURSES.map(c => {
  const matches = c.match(/^(\D+?)\s?(\d+.*)$/);
  if (!matches || !matches[2]) {
    console.log(`error reading ${c}, skipping...`);
    return;
  }
  const sub = matches[1];
  const num = matches[2];
  return () => printCourseAvailabilit({ subject: sub, courseNum: num as any, cookie: COOKIE });
})

promiseGenerators.reduce((p, f) => p.then(_ => f()), Promise.resolve());
