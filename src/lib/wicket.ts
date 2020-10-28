import {Wkt} from "wicket"
import {loadModule} from "../utils"

export interface Wicket{
    delimiter: string
    wrapVertices: string
    regExes: string
    components: any[]

    isCollection(): boolean
    sameCoords(a: any, b: any): boolean
    fromObject(obj: any): this
    toObject(config?: any): any
    toString(config?: any): string
    fromJson(obj: any): this
    toJson(): any
    merge(wkt: string): this
    read(str: string): this
    write(components?: Array<any>): string
    extract: {
        point(point: any): string
        multipoint(multipoint: any): string
        linestring(linestring: any): string
        multilinestring(multilinestring: any): string
        polygon(polygon: any): string
        multipolygon(multipolygon: any): string
        box(box: any): string
    }
    isRectangle: boolean
}
/** rewrite framework support from ( /node_modules/wicket/wicket-arcgis.js )  */
export class Wicket extends Wkt{
    
    // Mesh:__esri.MeshConstructor
    Circle:__esri.CircleConstructor
    Multipoint:__esri.MultipointConstructor
    Point:__esri.PointConstructor
    Polygon:__esri.PolygonConstructor
    Polyline:__esri.PolylineConstructor
    
    /**
     * A framework-dependent flag, set for each Wkt.Wkt() instance, that indicates
     * whether or not a closed polygon geometry should be interpreted as a rectangle.
     */
    isRectangle:boolean = false

    /**
     * An object of framework-dependent construction methods used to generate
     * objects belonging to the various geometry classes of the framework.
     */
    construct:{
        "point"?:(config?:any,component?:any)=>__esri.Point
        "multipoint"?:(config?:any)=>__esri.Multipoint
        "linestring"?:(config?:any)=>__esri.Polyline
        "multilinestring"?:(config?:any)=>__esri.Polyline
        "polygon"?:(config?:any)=>__esri.Polygon
        "multipolygon"?:(config?:any)=>__esri.Polygon
    } = {}

    deconstruct: (obj:any) => {type:any,components:any}

    async load(){
        // this.Mesh = await loadModule<__esri.MeshConstructor>("esri/geometry/Mesh")
        this.Circle= await loadModule<__esri.CircleConstructor>("esri/geometry/Circle")
        this.Multipoint= await loadModule<__esri.MultipointConstructor>("esri/geometry/Multipoint")
        this.Point= await loadModule<__esri.PointConstructor>("esri/geometry/Point")
        this.Polygon= await loadModule<__esri.PolygonConstructor>("esri/geometry/Polygon")
        this.Polyline= await loadModule<__esri.PolylineConstructor>("esri/geometry/Polyline")
        // add wicket.js framework support
        this.addArcgisConstruct()
        this.addArcgisDeConstruct()
        return this
    }

    addArcgisConstruct(){
        this.construct.point = (component,config)=>{
            
            var coord = component || this.components;
            if (coord instanceof Array) {
                coord = coord[0];
            }
            if (config) {
                // Allow the specification of a coordinate system
                coord.spatialReference = config.spatialReference || config.srs;
            }
            return new this.Point(coord);
        }

        this.construct.multipoint = (config = {})=>{
            if (!config.spatialReference && config.srs) {
                config.spatialReference = config.srs;
            }
            return new this.Multipoint({
                // Create an Array of [x, y] coords from each point among the components
                points: this.components.map(i=>{
                    if (i instanceof Array) {
                        i = i[0]; // Unwrap coords
                    }
                    return [i.x, i.y];
                }),
                spatialReference: config.spatialReference
            });
        }

        this.construct.linestring = (config = {})=>{
            if (!config.spatialReference && config.srs) {
                config.spatialReference = config.srs;
            }

            return new this.Polyline({
                // Create an Array of paths...
                paths: [
                    this.components.map(function(i) {
                        return [i.x, i.y];
                    })
                ],
                spatialReference: config.spatialReference
            });
        }

        this.construct.multilinestring = (config = {})=>{
            if (!config.spatialReference && config.srs) {
                config.spatialReference = config.srs;
            }

            return new this.Polyline({
                // Create an Array of paths...
                paths: this.components.map(function(i) {
                    // ...Within which are Arrays of coordinate pairs (vertices)
                    return i.map(function(j) {
                        return [j.x, j.y];
                    });
                }),
                spatialReference: config.spatialReference
            });
        }

        this.construct.polygon = (config = {})=>{
            if (!config.spatialReference && config.srs) {
                config.spatialReference = config.srs;
            }

            return new this.Polygon({
                // Create an Array of rings...
                rings: this.components.map(function(i) {
                    // ...Within which are Arrays of coordinate pairs (vertices)
                    return i.map(function(j) {
                        return [j.x, j.y];
                    });
                }),
                spatialReference: config.spatialReference
            });
        }

        this.construct.multipolygon = (config={})=>{
            
            if (!config.spatialReference && config.srs) {
                config.spatialReference = config.srs;
            }
            return new this.Polygon({
                // Create an Array of rings...
                rings: (()=>{
                    let i, j, holey, newRings, rings;

                    holey = false; // Assume there are no inner rings (holes)
                    rings = this.components.map(function(i) {
                        // ...Within which are Arrays of (outer) rings (polygons)
                        var rings = i.map(function(j) {
                            // ...Within which are (possibly) Arrays of (inner) rings (holes)
                            return j.map(function(k) {
                                return [k.x, k.y];
                            });
                        });

                        /** 2020/01 fix @see https://github.com/arthur-e/Wicket/blob/master/wicket-arcgis.js#L207 */
                        holey = holey||(rings.length > 1);

                        return rings;
                    });

                    if (!holey && rings[0].length > 1) { // Easy, if there are no inner rings (holes)
                        // But we add the second condition to check that we're not too deeply nested
                        return rings;
                    }

                    newRings = [];
                    for (i = 0; i < rings.length; i += 1) {
                        if (rings[i].length > 1) {
                            for (j = 0; j < rings[i].length; j += 1) {
                                newRings.push(rings[i][j]);
                            }
                        } else {
                            newRings.push(rings[i][0]);
                        }
                    }

                    return newRings;

                })(),
                spatialReference: config.spatialReference
            });
        }

    }
    
    private _isInnerRingOf(ring1, ring2, srs){
        var contained, i, ply, pnt;

        // Though less common, we assume that the first ring is an inner ring of the
        //  second as this is a stricter case (all vertices must be contained);
        //  we'll test this against the contrary where at least one vertex of the
        //  first ring is not contained by the second ring (ergo, not an inner ring)
        contained = true;
    
        ply = new this.Polygon({ // Create single polygon from second ring
            rings: ring2.map(function(i) {
                // ...Within which are Arrays of coordinate pairs (vertices)
                return i.map(function(j) {
                    return [j.x, j.y];
                });
            }),
            spatialReference: srs
        });
    
        for (i = 0; i < ring1.length; i += 1) {
            // Sample a vertex of the first ring
            pnt = new this.Point({x:ring1[i].x,y:ring1[i].y,spatialReference:srs});
    
            // Now we have a test for inner rings: if the second ring does not
            //  contain every vertex of the first, then the first ring cannot be
            //  an inner ring of the second
            if (!ply.contains(pnt)) {
                contained = false;
                break;
            }
        }
        return contained;
    }

    addArcgisDeConstruct(){
        this.deconstruct = obj=>{
            var i, j, paths, rings, verts;

            if (obj instanceof this.Point) {
                return {
                    type: 'point',
                    components: [{
                        x: obj.x,
                        y: obj.y
                    }]
                };
            }
            else if(obj instanceof this.Multipoint){
                verts = [];
                for (i = 0; i < obj.points.length; i += 1) {
                    verts.push([{
                        x: obj.points[i][0],
                        y: obj.points[i][1]
                    }]);
                }
                return {
                    type: 'multipoint',
                    components: verts
                };
            }
            else if(obj instanceof this.Polyline){
                paths = [];
                for (i = 0; i < obj.paths.length; i += 1) {
                    verts = [];
                    for (j = 0; j < obj.paths[i].length; j += 1) {
                        verts.push({
                            x: obj.paths[i][j][0], // First item is longitude, second is latitude
                            y: obj.paths[i][j][1]
                        });
                    }
                    paths.push(verts);
                }

                if (obj.paths.length > 1) { // More than one path means more than one linestring
                    return {
                        type: 'multilinestring',
                        components: paths
                    };
                }

                return {
                    type: 'linestring',
                    components: verts
                };
            }
            else if(obj instanceof this.Polygon || obj instanceof this.Circle){
                rings = [];
                for (i = 0; i < obj.rings.length; i += 1) {
                    verts = [];
                    for (j = 0; j < obj.rings[i].length; j += 1) {
                        verts.push({
                            x: obj.rings[i][j][0], // First item is longitude, second is latitude
                            y: obj.rings[i][j][1]
                        });
                    }
                    if (i > 0) {
                        if (this._isInnerRingOf(verts, rings[rings.length - 1], obj.spatialReference)) {
                            rings[rings.length - 1].push(verts);
                        } else {
                            rings.push([verts]);
                        }
                    } else {
                        rings.push([verts]);
                    }
                }

                if (rings.length > 1) {
                    return {
                        type: 'multipolygon',
                        components: rings
                    };
                }

                return {
                    type: 'polygon',
                    components: rings[0]
                };

            }
        }
    }

}