declare namespace __utils {
    //- 定義 wicket 型別、舊套件沒有型別支援
    interface Wkt{
        new ():Wkt
        delimiter: string
        wrapVertices: string
        regExes: string
        components: string
        isCollection(): boolean
        sameCoords(a: any, b: any): boolean
        fromObject(obj: any): Wkt
        toObject(config?: any): any
        toString(config?: any): string
        fromJson(obj: any): Wkt
        toJson(): any
        merge(wkt: string): Wkt
        read(str: string): Wkt
        write(components?: Array<any>): string
        extract: Extract
        isRectangle: boolean
    }
    interface Extract {
        point(point: any): string
        multipoint(multipoint: any): string
        linestring(linestring: any): string
        multilinestring(multilinestring: any): string
        polygon(polygon: any): string
        multipolygon(multipolygon: any): string
        box(box: any): string
    }
}