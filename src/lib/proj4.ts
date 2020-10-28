import Proj4js from "proj4"

/**
 * @see http://help.arcgis.com/en/arcims/10.0/mainhelp/mergedProjects/ArcXMLGuide/elements/pcs.htm#102319
 * 
 * check EPSG 900913 & 4326
 * @see https://qastack.cn/gis/34276/whats-the-difference-between-epsg4326-and-epsg900913
 */

const defs = {
    "EPSG:3821":"+title=經緯度：TWD67 +proj=longlat +towgs84=-752,-358,-179,-.0000011698,.0000018398,.0000009822,.00002329 +ellps=aust_SA +units=度 +no_defs",
    'EPSG:4326':'+title=WGS84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees',
    'EPSG:3826':'+title=TWD97 TM2+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +units=���� +no_defs',
    'EPSG:3828':'+title=TWD67 TM2+proj=tmerc +lat_0=0 +lon_0=121 +k=0.9999 +x_0=250000 +y_0=0 +ellps=aust_SA +units=m +towgs84=-752,-358,-179,-0.0000011698,0.0000018398,0.0000009822,0.00002329 +no_defs',
    'EPSG:4269':'+title=NAD83 (long/lat) +proj=longlat +a=6378137.0 +b=6356752.31414036 +ellps=GRS80 +datum=NAD83 +units=degrees',
    "EPSG:3857":"+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs",
    "EPSG:900913":"+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +no_defs",
    "EPSG:4302":"+title=Trinidad 1903 EPSG:4302 (7 param datum shift) +proj=longlat +a=6378293.63683822 +b=6356617.979337744 +towgs84=-61.702,284.488,472.052,0,0,0,0",
    "EPSG:4272":"+title=NZGD49 +proj=longlat +ellps=intl +datum=nzgd49 +no_defs",
    "EPSG:42304":"+title=Atlas of Canada, LCC +proj=lcc +lat_1=49 +lat_2=77 +lat_0=49 +lon_0=-95 +x_0=0 +y_0=0 +ellps=GRS80 +datum=NAD83 +units=m +no_defs",
    "EPSG:3825": "+title=�G�פ��a�GTWD97 TM2 ��� +proj=tmerc +lat_0=0 +lon_0=119 +k=0.9999 +x_0=250000 +y_0=0 +ellps=GRS80 +units=���� +no_defs",
    // "EPSG:4139": "+title=Puerto Rico EPSG:4139 (3 param datum shift) +proj=longlat +towgs84 = 11,72,-101,0,0,0,0 +a=6378206.4 +b=6356583.8",
    // "EPSG:4181": "+title=Luxembourg 1930 EPSG:4181 (7 param datum shift) +proj=longlat +towgs84=-193,13.7,-39.3,-0.41,-2.933,2.688,0.43 +a=6378388.0, +b=6356911.94612795",
    // "EPSG:21781": "+title=CH1903 / LV03 +proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs",
    // "EPSG:26591": "+title= Monte Mario (Rome) / Italy zone 1 EPSG:26591 +proj=tmerc +lat_0=0 +lon_0=-3.45233333333333 +from_greenwich=12.45233333333333 +k=0.999600 +x_0=1500000 +y_0=0 +a=6378388.0, +b=6356911.94612795 +units=m",
    // "EPSG:26912" :+title=NAD83 / UTM zone 12N +proj=utm +zone=12 +a=6378137.0 +b=6356752.3141403",
    // "EPSG:27200": "+title=New Zealand Map Grid\  +proj=nzmg \  +lat_0=-41 +lon_0=173 \  +x_0=2510000 +y_0=6023150 \  +ellps=intl +datum=nzgd49 +units=m +no_defs",
    // "EPSG:27563": "+title=NTF (Paris)/Lambert Sud France +proj=lcc +lat_1=44.10000000000001 +lat_0=44.10000000000001 +lon_0=0 +k_0=0.9998774990000001 +x_0=600000 +y_0=200000 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +no_defs ",
    // "EPSG:41001": "+title=simple mercator EPSG:41001 +proj=merc +lat_ts=0 +lon_0=0 +k=1.000000 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m",
    // "EPSG:102757": "+title=NAD 1983 StatePlane Wyoming West Central FIPS 4903 Feet +proj=tmerc +lat_0=40.5 +lon_0=-108.75 +x_0=600000.0 +y_0=0 +k=0.999938 +a=6378137.0  +b=6356752.3141403 +to_meter=0.3048006096012192",
    // "EPSG:102758": "+title=NAD 1983 StatePlane Wyoming West FIPS 4904 Feet +proj=tmerc +lat_0=40.5  +lon_0=-110.0833333333333 +x_0=800000  +y_0=100000  +k=0.999938 +a=6378137.0 +b=6356752.3141403 +to_meter=0.3048006096012192",
}

Proj4js.defs(Object.keys(defs).map(k=>([k,defs[k]])))


export const proj = (fromEPSG:string|number,toEPSG:string|number,coords:number[]):number[]=>{
    const WKID = {
        102441:"EPSG:3828",
        // 102442:"EPSG:3827",
        102443:"EPSG:3826",
        102444:"EPSG:3825",
        3857:"EPSG:900913",
        102100:"EPSG:900913",
        4326:"EPSG:4326"
    }
    fromEPSG = WKID[fromEPSG] || fromEPSG
    toEPSG = WKID[toEPSG] || fromEPSG
    return Proj4js(fromEPSG as string,toEPSG as string).forward(coords)
}


export const proj97to67 = (coord:number[])=>Proj4js("EPSG:3826","EPSG:3828").forward(coord)
export const proj67to97 = (coord:number[])=>Proj4js("EPSG:3826","EPSG:3828").inverse(coord)

/** EPSG:4326 refers to WGS 84 whereas EPSG:900913|EPSG:102100|EPSG:3857 refers to WGS 84 / Pseudo-Mercator. */
export const proj97to84 = (coord:number[])=>Proj4js("EPSG:3826","EPSG:3857").forward(coord)
export const proj84to97 = (coord:number[])=>Proj4js("EPSG:3826","EPSG:3857").inverse(coord)

export const proj84to67 = (coord:number[])=>Proj4js("EPSG:3857","EPSG:3828").forward(coord)
export const proj67to84 = (coord:number[])=>Proj4js("EPSG:3857","EPSG:3828").inverse(coord)
