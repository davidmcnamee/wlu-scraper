import axios, { AxiosRequestConfig } from 'axios';
const BASE_URL = 'https://loris.wlu.ca/register/ssb/searchResults/searchResults';

enum TermNum {
  SPRING_2021 = "202105",
  WINTER_2021 = "202101",
  FALL_2020 = "202009",
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
  const MIN_DELAY = 700;
  const MAX_DELAY = 2000;
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

// INPUT GOES HERE

const COOKIE = `INSERT_COOKIE_HERE`;

const subject = 'BU';
const courseNum = '491';

const delays = delayGenerator(Object.keys(TermNum).length);

Object.keys(TermNum).map((term, i) => {
  const myFunc = async (t: string) => {
    const termStr = TermNum[t];
    let results: string | number = "";
    try {
      const arr = await scrape({ subject, courseNum, termStr, cookie: COOKIE });
      results = arr.length ? "offered" : "not offered";
    } catch (err) {
      results = 'error';
    }
    console.log(`${t}\t${results}`);
  }
  setTimeout(() => myFunc(term), delays[i]);
});
