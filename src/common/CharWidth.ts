/**
 * Copyright (c) 2016 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { fill } from 'common/TypedArrayUtils';

// helper: binary search
function bisearch(ucs: number, data: number[][]): boolean {
  let min = 0;
  let max = data.length - 1;
  let mid;
  if (ucs < data[0][0] || ucs > data[max][1]) {
    return false;
  }
  while (max >= min) {
    mid = (min + max) >> 1;
    if (ucs > data[mid][1]) {
      min = mid + 1;
    } else if (ucs < data[mid][0]) {
      max = mid - 1;
    } else {
      return true;
    }
  }
  return false;
}

function getStringCellWidthPrivate(wcwidthImpl: (cp: number) => number, s: string): number {
  let result = 0;
  const length = s.length;
  for (let i = 0; i < length; ++i) {
    let code = s.charCodeAt(i);
    // surrogate pair first
    if (0xD800 <= code && code <= 0xDBFF) {
      if (++i >= length) {
        // this should not happen with strings retrieved from
        // Buffer.translateToString as it converts from UTF-32
        // and therefore always should contain the second part
        // for any other string we still have to handle it somehow:
        // simply treat the lonely surrogate first as a single char (UCS-2 behavior)
        return result + wcwidthImpl(code);
      }
      const second = s.charCodeAt(i);
      // convert surrogate pair to high codepoint only for valid second part (UTF-16)
      // otherwise treat them independently (UCS-2 behavior)
      if (0xDC00 <= second && second <= 0xDFFF) {
        code = (code - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
      } else {
        result += wcwidthImpl(second);
      }
    }
    result += wcwidthImpl(code);
  }
  return result;
}

/**
 * Unicode version 6
 */
const BMP_COMBINING_V6 = [
  [0x0300, 0x036F], [0x0483, 0x0486], [0x0488, 0x0489],
  [0x0591, 0x05BD], [0x05BF, 0x05BF], [0x05C1, 0x05C2],
  [0x05C4, 0x05C5], [0x05C7, 0x05C7], [0x0600, 0x0603],
  [0x0610, 0x0615], [0x064B, 0x065E], [0x0670, 0x0670],
  [0x06D6, 0x06E4], [0x06E7, 0x06E8], [0x06EA, 0x06ED],
  [0x070F, 0x070F], [0x0711, 0x0711], [0x0730, 0x074A],
  [0x07A6, 0x07B0], [0x07EB, 0x07F3], [0x0901, 0x0902],
  [0x093C, 0x093C], [0x0941, 0x0948], [0x094D, 0x094D],
  [0x0951, 0x0954], [0x0962, 0x0963], [0x0981, 0x0981],
  [0x09BC, 0x09BC], [0x09C1, 0x09C4], [0x09CD, 0x09CD],
  [0x09E2, 0x09E3], [0x0A01, 0x0A02], [0x0A3C, 0x0A3C],
  [0x0A41, 0x0A42], [0x0A47, 0x0A48], [0x0A4B, 0x0A4D],
  [0x0A70, 0x0A71], [0x0A81, 0x0A82], [0x0ABC, 0x0ABC],
  [0x0AC1, 0x0AC5], [0x0AC7, 0x0AC8], [0x0ACD, 0x0ACD],
  [0x0AE2, 0x0AE3], [0x0B01, 0x0B01], [0x0B3C, 0x0B3C],
  [0x0B3F, 0x0B3F], [0x0B41, 0x0B43], [0x0B4D, 0x0B4D],
  [0x0B56, 0x0B56], [0x0B82, 0x0B82], [0x0BC0, 0x0BC0],
  [0x0BCD, 0x0BCD], [0x0C3E, 0x0C40], [0x0C46, 0x0C48],
  [0x0C4A, 0x0C4D], [0x0C55, 0x0C56], [0x0CBC, 0x0CBC],
  [0x0CBF, 0x0CBF], [0x0CC6, 0x0CC6], [0x0CCC, 0x0CCD],
  [0x0CE2, 0x0CE3], [0x0D41, 0x0D43], [0x0D4D, 0x0D4D],
  [0x0DCA, 0x0DCA], [0x0DD2, 0x0DD4], [0x0DD6, 0x0DD6],
  [0x0E31, 0x0E31], [0x0E34, 0x0E3A], [0x0E47, 0x0E4E],
  [0x0EB1, 0x0EB1], [0x0EB4, 0x0EB9], [0x0EBB, 0x0EBC],
  [0x0EC8, 0x0ECD], [0x0F18, 0x0F19], [0x0F35, 0x0F35],
  [0x0F37, 0x0F37], [0x0F39, 0x0F39], [0x0F71, 0x0F7E],
  [0x0F80, 0x0F84], [0x0F86, 0x0F87], [0x0F90, 0x0F97],
  [0x0F99, 0x0FBC], [0x0FC6, 0x0FC6], [0x102D, 0x1030],
  [0x1032, 0x1032], [0x1036, 0x1037], [0x1039, 0x1039],
  [0x1058, 0x1059], [0x1160, 0x11FF], [0x135F, 0x135F],
  [0x1712, 0x1714], [0x1732, 0x1734], [0x1752, 0x1753],
  [0x1772, 0x1773], [0x17B4, 0x17B5], [0x17B7, 0x17BD],
  [0x17C6, 0x17C6], [0x17C9, 0x17D3], [0x17DD, 0x17DD],
  [0x180B, 0x180D], [0x18A9, 0x18A9], [0x1920, 0x1922],
  [0x1927, 0x1928], [0x1932, 0x1932], [0x1939, 0x193B],
  [0x1A17, 0x1A18], [0x1B00, 0x1B03], [0x1B34, 0x1B34],
  [0x1B36, 0x1B3A], [0x1B3C, 0x1B3C], [0x1B42, 0x1B42],
  [0x1B6B, 0x1B73], [0x1DC0, 0x1DCA], [0x1DFE, 0x1DFF],
  [0x200B, 0x200F], [0x202A, 0x202E], [0x2060, 0x2063],
  [0x206A, 0x206F], [0x20D0, 0x20EF], [0x302A, 0x302F],
  [0x3099, 0x309A], [0xA806, 0xA806], [0xA80B, 0xA80B],
  [0xA825, 0xA826], [0xFB1E, 0xFB1E], [0xFE00, 0xFE0F],
  [0xFE20, 0xFE23], [0xFEFF, 0xFEFF], [0xFFF9, 0xFFFB]
];
const HIGH_COMBINING_V6 = [
  [0x10A01, 0x10A03], [0x10A05, 0x10A06], [0x10A0C, 0x10A0F],
  [0x10A38, 0x10A3A], [0x10A3F, 0x10A3F], [0x1D167, 0x1D169],
  [0x1D173, 0x1D182], [0x1D185, 0x1D18B], [0x1D1AA, 0x1D1AD],
  [0x1D242, 0x1D244], [0xE0001, 0xE0001], [0xE0020, 0xE007F],
  [0xE0100, 0xE01EF]
];

// create lookup table for BMP plane
const BMP_TABLE_V6 = new Uint8Array(65536);
fill(BMP_TABLE_V6, 1);
BMP_TABLE_V6[0] = 0;
// control chars
fill(BMP_TABLE_V6, 0, 1, 32);
fill(BMP_TABLE_V6, 0, 0x7f, 0xa0);

// apply wide char rules first
// wide chars
fill(BMP_TABLE_V6, 2, 0x1100, 0x1160);
BMP_TABLE_V6[0x2329] = 2;
BMP_TABLE_V6[0x232a] = 2;
fill(BMP_TABLE_V6, 2, 0x2e80, 0xa4d0);
BMP_TABLE_V6[0x303f] = 1;  // wrongly in last line

fill(BMP_TABLE_V6, 2, 0xac00, 0xd7a4);
fill(BMP_TABLE_V6, 2, 0xf900, 0xfb00);
fill(BMP_TABLE_V6, 2, 0xfe10, 0xfe1a);
fill(BMP_TABLE_V6, 2, 0xfe30, 0xfe70);
fill(BMP_TABLE_V6, 2, 0xff00, 0xff61);
fill(BMP_TABLE_V6, 2, 0xffe0, 0xffe7);

// apply combining last to ensure we overwrite
// wrongly wide set chars:
//    the original algo evals combining first and falls
//    through to wide check so we simply do here the opposite
// combining 0
for (let r = 0; r < BMP_COMBINING_V6.length; ++r) {
  fill(BMP_TABLE_V6, 0, BMP_COMBINING_V6[r][0], BMP_COMBINING_V6[r][1] + 1);
}

export function wcwidthV6(num: number): number {
  if (num < 32) return 0;
  if (num < 127) return 1;
  if (num < 65536) return BMP_TABLE_V6[num];
  if (bisearch(num, HIGH_COMBINING_V6)) return 0;
  if ((num >= 0x20000 && num <= 0x2fffd) || (num >= 0x30000 && num <= 0x3fffd)) return 2;
  return 1;
}

export function getStringCellWidthV6(s: string): number {
  return getStringCellWidthPrivate(wcwidthV6, s);
}

/**
 * Unicode version 10
 */
const BMP_COMBINING_V10 = [
  [0x0300, 0x036F], [0x0483, 0x0489], [0x0591, 0x05BD],
  [0x05BF, 0x05BF], [0x05C1, 0x05C2], [0x05C4, 0x05C5],
  [0x05C7, 0x05C7], [0x0600, 0x0605], [0x0610, 0x061A],
  [0x061C, 0x061C], [0x064B, 0x065F], [0x0670, 0x0670],
  [0x06D6, 0x06DD], [0x06DF, 0x06E4], [0x06E7, 0x06E8],
  [0x06EA, 0x06ED], [0x070F, 0x070F], [0x0711, 0x0711],
  [0x0730, 0x074A], [0x07A6, 0x07B0], [0x07EB, 0x07F3],
  [0x07FD, 0x07FD], [0x0816, 0x0819], [0x081B, 0x0823],
  [0x0825, 0x0827], [0x0829, 0x082D], [0x0859, 0x085B],
  [0x08D3, 0x0902], [0x093A, 0x093A], [0x093C, 0x093C],
  [0x0941, 0x0948], [0x094D, 0x094D], [0x0951, 0x0957],
  [0x0962, 0x0963], [0x0981, 0x0981], [0x09BC, 0x09BC],
  [0x09C1, 0x09C4], [0x09CD, 0x09CD], [0x09E2, 0x09E3],
  [0x09FE, 0x09FE], [0x0A01, 0x0A02], [0x0A3C, 0x0A3C],
  [0x0A41, 0x0A42], [0x0A47, 0x0A48], [0x0A4B, 0x0A4D],
  [0x0A51, 0x0A51], [0x0A70, 0x0A71], [0x0A75, 0x0A75],
  [0x0A81, 0x0A82], [0x0ABC, 0x0ABC], [0x0AC1, 0x0AC5],
  [0x0AC7, 0x0AC8], [0x0ACD, 0x0ACD], [0x0AE2, 0x0AE3],
  [0x0AFA, 0x0AFF], [0x0B01, 0x0B01], [0x0B3C, 0x0B3C],
  [0x0B3F, 0x0B3F], [0x0B41, 0x0B44], [0x0B4D, 0x0B4D],
  [0x0B56, 0x0B56], [0x0B62, 0x0B63], [0x0B82, 0x0B82],
  [0x0BC0, 0x0BC0], [0x0BCD, 0x0BCD], [0x0C00, 0x0C00],
  [0x0C04, 0x0C04], [0x0C3E, 0x0C40], [0x0C46, 0x0C48],
  [0x0C4A, 0x0C4D], [0x0C55, 0x0C56], [0x0C62, 0x0C63],
  [0x0C81, 0x0C81], [0x0CBC, 0x0CBC], [0x0CBF, 0x0CBF],
  [0x0CC6, 0x0CC6], [0x0CCC, 0x0CCD], [0x0CE2, 0x0CE3],
  [0x0D00, 0x0D01], [0x0D3B, 0x0D3C], [0x0D41, 0x0D44],
  [0x0D4D, 0x0D4D], [0x0D62, 0x0D63], [0x0DCA, 0x0DCA],
  [0x0DD2, 0x0DD4], [0x0DD6, 0x0DD6], [0x0E31, 0x0E31],
  [0x0E34, 0x0E3A], [0x0E47, 0x0E4E], [0x0EB1, 0x0EB1],
  [0x0EB4, 0x0EBC], [0x0EC8, 0x0ECD], [0x0F18, 0x0F19],
  [0x0F35, 0x0F35], [0x0F37, 0x0F37], [0x0F39, 0x0F39],
  [0x0F71, 0x0F7E], [0x0F80, 0x0F84], [0x0F86, 0x0F87],
  [0x0F8D, 0x0F97], [0x0F99, 0x0FBC], [0x0FC6, 0x0FC6],
  [0x102D, 0x1030], [0x1032, 0x1037], [0x1039, 0x103A],
  [0x103D, 0x103E], [0x1058, 0x1059], [0x105E, 0x1060],
  [0x1071, 0x1074], [0x1082, 0x1082], [0x1085, 0x1086],
  [0x108D, 0x108D], [0x109D, 0x109D], [0x1160, 0x11FF],
  [0x135D, 0x135F], [0x1712, 0x1714], [0x1732, 0x1734],
  [0x1752, 0x1753], [0x1772, 0x1773], [0x17B4, 0x17B5],
  [0x17B7, 0x17BD], [0x17C6, 0x17C6], [0x17C9, 0x17D3],
  [0x17DD, 0x17DD], [0x180B, 0x180E], [0x1885, 0x1886],
  [0x18A9, 0x18A9], [0x1920, 0x1922], [0x1927, 0x1928],
  [0x1932, 0x1932], [0x1939, 0x193B], [0x1A17, 0x1A18],
  [0x1A1B, 0x1A1B], [0x1A56, 0x1A56], [0x1A58, 0x1A5E],
  [0x1A60, 0x1A60], [0x1A62, 0x1A62], [0x1A65, 0x1A6C],
  [0x1A73, 0x1A7C], [0x1A7F, 0x1A7F], [0x1AB0, 0x1ABE],
  [0x1B00, 0x1B03], [0x1B34, 0x1B34], [0x1B36, 0x1B3A],
  [0x1B3C, 0x1B3C], [0x1B42, 0x1B42], [0x1B6B, 0x1B73],
  [0x1B80, 0x1B81], [0x1BA2, 0x1BA5], [0x1BA8, 0x1BA9],
  [0x1BAB, 0x1BAD], [0x1BE6, 0x1BE6], [0x1BE8, 0x1BE9],
  [0x1BED, 0x1BED], [0x1BEF, 0x1BF1], [0x1C2C, 0x1C33],
  [0x1C36, 0x1C37], [0x1CD0, 0x1CD2], [0x1CD4, 0x1CE0],
  [0x1CE2, 0x1CE8], [0x1CED, 0x1CED], [0x1CF4, 0x1CF4],
  [0x1CF8, 0x1CF9], [0x1DC0, 0x1DF9], [0x1DFB, 0x1DFF],
  [0x200B, 0x200F], [0x202A, 0x202E], [0x2060, 0x2064],
  [0x2066, 0x206F], [0x20D0, 0x20F0], [0x2CEF, 0x2CF1],
  [0x2D7F, 0x2D7F], [0x2DE0, 0x2DFF], [0x302A, 0x302D],
  [0x3099, 0x309A], [0xA66F, 0xA672], [0xA674, 0xA67D],
  [0xA69E, 0xA69F], [0xA6F0, 0xA6F1], [0xA802, 0xA802],
  [0xA806, 0xA806], [0xA80B, 0xA80B], [0xA825, 0xA826],
  [0xA8C4, 0xA8C5], [0xA8E0, 0xA8F1], [0xA8FF, 0xA8FF],
  [0xA926, 0xA92D], [0xA947, 0xA951], [0xA980, 0xA982],
  [0xA9B3, 0xA9B3], [0xA9B6, 0xA9B9], [0xA9BC, 0xA9BD],
  [0xA9E5, 0xA9E5], [0xAA29, 0xAA2E], [0xAA31, 0xAA32],
  [0xAA35, 0xAA36], [0xAA43, 0xAA43], [0xAA4C, 0xAA4C],
  [0xAA7C, 0xAA7C], [0xAAB0, 0xAAB0], [0xAAB2, 0xAAB4],
  [0xAAB7, 0xAAB8], [0xAABE, 0xAABF], [0xAAC1, 0xAAC1],
  [0xAAEC, 0xAAED], [0xAAF6, 0xAAF6], [0xABE5, 0xABE5],
  [0xABE8, 0xABE8], [0xABED, 0xABED], [0xFB1E, 0xFB1E],
  [0xFE00, 0xFE0F], [0xFE20, 0xFE2F], [0xFEFF, 0xFEFF],
  [0xFFF9, 0xFFFB]
];

const HIGH_COMBINING_V10 = [
  [0x101FD, 0x101FD], [0x102E0, 0x102E0],
  [0x10376, 0x1037A], [0x10A01, 0x10A03], [0x10A05, 0x10A06],
  [0x10A0C, 0x10A0F], [0x10A38, 0x10A3A], [0x10A3F, 0x10A3F],
  [0x10AE5, 0x10AE6], [0x10D24, 0x10D27], [0x10F46, 0x10F50],
  [0x11001, 0x11001], [0x11038, 0x11046], [0x1107F, 0x11081],
  [0x110B3, 0x110B6], [0x110B9, 0x110BA], [0x110BD, 0x110BD],
  [0x110CD, 0x110CD], [0x11100, 0x11102], [0x11127, 0x1112B],
  [0x1112D, 0x11134], [0x11173, 0x11173], [0x11180, 0x11181],
  [0x111B6, 0x111BE], [0x111C9, 0x111CC], [0x1122F, 0x11231],
  [0x11234, 0x11234], [0x11236, 0x11237], [0x1123E, 0x1123E],
  [0x112DF, 0x112DF], [0x112E3, 0x112EA], [0x11300, 0x11301],
  [0x1133B, 0x1133C], [0x11340, 0x11340], [0x11366, 0x1136C],
  [0x11370, 0x11374], [0x11438, 0x1143F], [0x11442, 0x11444],
  [0x11446, 0x11446], [0x1145E, 0x1145E], [0x114B3, 0x114B8],
  [0x114BA, 0x114BA], [0x114BF, 0x114C0], [0x114C2, 0x114C3],
  [0x115B2, 0x115B5], [0x115BC, 0x115BD], [0x115BF, 0x115C0],
  [0x115DC, 0x115DD], [0x11633, 0x1163A], [0x1163D, 0x1163D],
  [0x1163F, 0x11640], [0x116AB, 0x116AB], [0x116AD, 0x116AD],
  [0x116B0, 0x116B5], [0x116B7, 0x116B7], [0x1171D, 0x1171F],
  [0x11722, 0x11725], [0x11727, 0x1172B], [0x1182F, 0x11837],
  [0x11839, 0x1183A], [0x119D4, 0x119D7], [0x119DA, 0x119DB],
  [0x119E0, 0x119E0], [0x11A01, 0x11A0A], [0x11A33, 0x11A38],
  [0x11A3B, 0x11A3E], [0x11A47, 0x11A47], [0x11A51, 0x11A56],
  [0x11A59, 0x11A5B], [0x11A8A, 0x11A96], [0x11A98, 0x11A99],
  [0x11C30, 0x11C36], [0x11C38, 0x11C3D], [0x11C3F, 0x11C3F],
  [0x11C92, 0x11CA7], [0x11CAA, 0x11CB0], [0x11CB2, 0x11CB3],
  [0x11CB5, 0x11CB6], [0x11D31, 0x11D36], [0x11D3A, 0x11D3A],
  [0x11D3C, 0x11D3D], [0x11D3F, 0x11D45], [0x11D47, 0x11D47],
  [0x11D90, 0x11D91], [0x11D95, 0x11D95], [0x11D97, 0x11D97],
  [0x11EF3, 0x11EF4], [0x13430, 0x13438], [0x16AF0, 0x16AF4],
  [0x16B30, 0x16B36], [0x16F4F, 0x16F4F], [0x16F8F, 0x16F92],
  [0x1BC9D, 0x1BC9E], [0x1BCA0, 0x1BCA3], [0x1D167, 0x1D169],
  [0x1D173, 0x1D182], [0x1D185, 0x1D18B], [0x1D1AA, 0x1D1AD],
  [0x1D242, 0x1D244], [0x1DA00, 0x1DA36], [0x1DA3B, 0x1DA6C],
  [0x1DA75, 0x1DA75], [0x1DA84, 0x1DA84], [0x1DA9B, 0x1DA9F],
  [0x1DAA1, 0x1DAAF], [0x1E000, 0x1E006], [0x1E008, 0x1E018],
  [0x1E01B, 0x1E021], [0x1E023, 0x1E024], [0x1E026, 0x1E02A],
  [0x1E130, 0x1E136], [0x1E2EC, 0x1E2EF], [0x1E8D0, 0x1E8D6],
  [0x1E944, 0x1E94A], [0xE0001, 0xE0001], [0xE0020, 0xE007F],
  [0xE0100, 0xE01EF]
];

const BMP_WIDE_V10 = [
  [0x1100, 0x115F], [0x231A, 0x231B], [0x2329, 0x232A],
  [0x23E9, 0x23EC], [0x23F0, 0x23F0], [0x23F3, 0x23F3],
  [0x25FD, 0x25FE], [0x2614, 0x2615], [0x2648, 0x2653],
  [0x267F, 0x267F], [0x2693, 0x2693], [0x26A1, 0x26A1],
  [0x26AA, 0x26AB], [0x26BD, 0x26BE], [0x26C4, 0x26C5],
  [0x26CE, 0x26CE], [0x26D4, 0x26D4], [0x26EA, 0x26EA],
  [0x26F2, 0x26F3], [0x26F5, 0x26F5], [0x26FA, 0x26FA],
  [0x26FD, 0x26FD], [0x2705, 0x2705], [0x270A, 0x270B],
  [0x2728, 0x2728], [0x274C, 0x274C], [0x274E, 0x274E],
  [0x2753, 0x2755], [0x2757, 0x2757], [0x2795, 0x2797],
  [0x27B0, 0x27B0], [0x27BF, 0x27BF], [0x2B1B, 0x2B1C],
  [0x2B50, 0x2B50], [0x2B55, 0x2B55], [0x2E80, 0x2E99],
  [0x2E9B, 0x2EF3], [0x2F00, 0x2FD5], [0x2FF0, 0x2FFB],
  [0x3000, 0x3029], [0x302E, 0x303E], [0x3041, 0x3096],
  [0x309B, 0x30FF], [0x3105, 0x312F], [0x3131, 0x318E],
  [0x3190, 0x31BA], [0x31C0, 0x31E3], [0x31F0, 0x321E],
  [0x3220, 0x3247], [0x3250, 0x4DBF], [0x4E00, 0xA48C],
  [0xA490, 0xA4C6], [0xA960, 0xA97C], [0xAC00, 0xD7A3],
  [0xF900, 0xFAFF], [0xFE10, 0xFE19], [0xFE30, 0xFE52],
  [0xFE54, 0xFE66], [0xFE68, 0xFE6B], [0xFF01, 0xFF60],
  [0xFFE0, 0xFFE6]
];

const HIGH_WIDE_V10 = [
  [0x16FE0, 0x16FE3], [0x17000, 0x187F7],
  [0x18800, 0x18AF2], [0x1B000, 0x1B11E], [0x1B150, 0x1B152],
  [0x1B164, 0x1B167], [0x1B170, 0x1B2FB], [0x1F004, 0x1F004],
  [0x1F0CF, 0x1F0CF], [0x1F18E, 0x1F18E], [0x1F191, 0x1F19A],
  [0x1F200, 0x1F202], [0x1F210, 0x1F23B], [0x1F240, 0x1F248],
  [0x1F250, 0x1F251], [0x1F260, 0x1F265], [0x1F300, 0x1F320],
  [0x1F32D, 0x1F335], [0x1F337, 0x1F37C], [0x1F37E, 0x1F393],
  [0x1F3A0, 0x1F3CA], [0x1F3CF, 0x1F3D3], [0x1F3E0, 0x1F3F0],
  [0x1F3F4, 0x1F3F4], [0x1F3F8, 0x1F43E], [0x1F440, 0x1F440],
  [0x1F442, 0x1F4FC], [0x1F4FF, 0x1F53D], [0x1F54B, 0x1F54E],
  [0x1F550, 0x1F567], [0x1F57A, 0x1F57A], [0x1F595, 0x1F596],
  [0x1F5A4, 0x1F5A4], [0x1F5FB, 0x1F64F], [0x1F680, 0x1F6C5],
  [0x1F6CC, 0x1F6CC], [0x1F6D0, 0x1F6D2], [0x1F6D5, 0x1F6D5],
  [0x1F6EB, 0x1F6EC], [0x1F6F4, 0x1F6FA], [0x1F7E0, 0x1F7EB],
  [0x1F90D, 0x1F971], [0x1F973, 0x1F976], [0x1F97A, 0x1F9A2],
  [0x1F9A5, 0x1F9AA], [0x1F9AE, 0x1F9CA], [0x1F9CD, 0x1F9FF],
  [0x1FA70, 0x1FA73], [0x1FA78, 0x1FA7A], [0x1FA80, 0x1FA82],
  [0x1FA90, 0x1FA95], [0x20000, 0x2FFFD], [0x30000, 0x3FFFD]
];

const BMP_TABLE_V10 = new Uint8Array(65536);
fill(BMP_TABLE_V10, 1);
BMP_TABLE_V10[0] = 0;
fill(BMP_TABLE_V10, 0, 1, 32);
fill(BMP_TABLE_V10, 0, 0x7f, 0xa0);
for (let r = 0; r < BMP_COMBINING_V10.length; ++r) {
  fill(BMP_TABLE_V10, 0, BMP_COMBINING_V10[r][0], BMP_COMBINING_V10[r][1] + 1);
}
for (let r = 0; r < BMP_WIDE_V10.length; ++r) {
  fill(BMP_TABLE_V10, 2, BMP_WIDE_V10[r][0], BMP_WIDE_V10[r][1] + 1);
}

export function wcwidthV10(num: number): number {
  if (num < 32) return 0;
  if (num < 127) return 1;
  if (num < 65536) return BMP_TABLE_V10[num];
  if (bisearch(num, HIGH_COMBINING_V10)) return 0;
  if (bisearch(num, HIGH_WIDE_V10)) return 2;
  return 1;
}

export function getStringCellWidthV10(s: string): number {
  return getStringCellWidthPrivate(wcwidthV10, s);
}
