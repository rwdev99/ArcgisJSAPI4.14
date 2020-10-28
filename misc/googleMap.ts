import jsonp from "jsonp"
import { BaseDraw } from './draw'
import { Init } from './init'

class DrawDirectionPoint extends BaseDraw {
    constructor(Init: Init, glyr: __esri.GraphicsLayer) {
        super(Init, glyr)
    }

    private _getCloneGraphic(): __esri.Graphic {
        if (!this.glyr.graphics.length) return
        return this.glyr.graphics.getItemAt(0).clone()
    }

    //@override
    async perform() {
        this.clearGraphics()
        this.TipText.setText("點擊地圖預覽街景")

        this.Action = this.Draw.create("point", { mode: "click" })

        this.Action.on("cursor-update", async (evt: __draw.pointEvent) => {
            this.TipText.setPosition(evt)
        })
        await new Promise(resolve => {
            this.Action.on("draw-complete", async (evt: __draw.pointEvent) => {
                let point = await this.createPointByEvt(evt)

                this.glyr.add(new this.Graphic({
                    geometry: point,
                    symbol: this.symbol
                }))
                this.TipText.destroy()
                resolve(point) //- 僅完成Promise後續動作由建構該實例的父類決定
            })
        })
    }

    rotatePoint(viewRotation: number, angle: number) {
        let exsist = this._getCloneGraphic()
        if (!exsist) return

        exsist.symbol.set("angle", viewRotation + angle)
        this.clearGraphics()
        this.glyr.add(exsist)
    }

    async setPosition(loc: google.maps.LatLng | google.maps.LatLngLiteral) {
        let exsist = this._getCloneGraphic()
        if (!exsist) return

        exsist.geometry.set("latitude", loc.lat)
        exsist.geometry.set("longitude", loc.lng)

        this.clearGraphics()
        this.glyr.add(exsist)
    }

}

/**
 * Singleton @see https://stackoverflow.com/questions/10485582/what-is-the-proper-way-to-destroy-a-map-instance 
 * 普通地圖API @see https://developers.google.com/maps/documentation/javascript/earthquakes
 * 街景API @see https://developers.google.com/maps/documentation/javascript/streetview#StreetViewMapUsage
 * Goole map JS API @see https://developers.google.com/maps/documentation/javascript/reference
 */
export class GoogleMaps {

    private constructor(Init: Init, privateKey = 'AIzaSyDVPt9t_LzShq5tdE_-8wpFmIVKNhGUWAE') {
        this._container = document.createElement("div")
        this._key = privateKey
        this._Init = Init
    }
    private static _GoogleMaps: GoogleMaps
    public static async getInstance(Init: Init, privateKey: string) {
        if (GoogleMaps._GoogleMaps) {
            return GoogleMaps._GoogleMaps
        }
        GoogleMaps._GoogleMaps = new GoogleMaps(Init, privateKey)
        return GoogleMaps._GoogleMaps
    }

    private _key: string
    private _GmapStreetViewInstance: google.maps.StreetViewPanorama
    private _DrawDirectionPoint: DrawDirectionPoint
    private _container: HTMLElement
    private _Init: Init

    get gampAngle(): number {
        return this._GmapStreetViewInstance.getPov().heading
    }

    get gmapPos(): google.maps.LatLng | google.maps.LatLngLiteral {
        return this._GmapStreetViewInstance.getPosition().toJSON()
    }

    get drawedLoc():{lat:number,lng:number} {
        const {latitude,longitude} = this._DrawDirectionPoint.glyr.graphics.getItemAt(0).geometry as any
        return {lat:latitude,lng:longitude}
    }
    
    private async _create() {
        try {

            /** 使用 JSONP跨域取得 GoogleMap -> be loaded in window */
            await (new Promise((reslove, reject) => {
                jsonp(
                    `http://maps.googleapis.com/maps/api/js?key=${this._key}`,
                    {},
                    (err, data) => err ? reject(err) : reslove(data)
                )
            }))

            this._GmapStreetViewInstance = new window['google'].maps.StreetViewPanorama(
                this._container, {
                zoom: 12,
                pov: {
                    heading: 34,
                    pitch: 10
                }
            }) as google.maps.StreetViewPanorama

            await this._createDirPointMkr()

            this._GmapStreetViewInstance.addListener("pov_changed", async()=>{
                const view = this._Init.view as __esri.MapView
                await this._DrawDirectionPoint.setPosition(this.gmapPos)
                this._DrawDirectionPoint.rotatePoint(view.rotation, this.gampAngle)
            })

        } catch (e) {
            throw new Error(e)
        }
    }
    
    private async _createDirPointMkr() {
        try {
            const glyr = await new DrawFactory(this._Init).createGlyr({
                ID: "gmap_streect_view_singleton",
                Datatype: "graphicslayer",
                LayerName: "街景位置點單例"
            })
            this._DrawDirectionPoint = new DrawDirectionPoint(this._Init, glyr)
            await this._DrawDirectionPoint.create({
                symbol: {
                    type: "picture-marker",  // autocasts as new PictureMarkerSymbol()
                    url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASkAAAEsCAYAAACfVEUxAAAACXBIWXMAAC4jAAAuIwF4pT92AAAgAElEQVR4nO2dCXgURd7Ga3IQQkhCgiByBQJySQhLlAgKKkcQDUlAkZUzrgqKEFBBRUUjuysfIs+ux4eEMwK6yL14IIt4IIgxks8rIY9AhKCgXHIE4kJCvqeSGZjU1KS6qntmeqbf3/M0pLq6erpret6uevtf1baqqioCgC4yMxuR3NxTqETgCYJQq0AXmZlTCSEbUYnAU6AlBdTJzGxDCPmGEBJNCHmU5Ob+E7UJjAYtKaCHXLtAUbLtogWAoUCkgBqZmdmEkFucykaj2wc8AUQKyJOZ2Z0Q8jynXKJdvAAwDIgUUCG3jjLP20UMAEOASAE5alpKiYIyudVhCQAYAEQKaMd9N48lsdpIB8AAIFJAhrq6eSxTSGbmrahdoBeIFNCGtm4eC7p9QDcQKSBGezePJU6y9QWACxApi2KToIqQXDouQXFJrxw3bqjM59WF1b83KwKRAnVSOXbsPxS6ebUIstmWnbr3XnT7gBIQKeCWi2PH3mqz2aYYUEPRUfXqbUBNAxUgUoALbfkE22zLDKydWyrHjp2K2gayQKT8EG94O5Ghoc/bjW/DsNlsz5ePHq1rEDI8LesBkQIuGNjNY4kOCw5Gtw9IAZECtfBAN48lsXLsWJVwBmBRIFKgFp7o5rHQbt+FMWMwCBloAiIFLuPBbp4LIUFBCEsAmghBNfkeMxi6h4YPjwkiZJkXp5NOjAgNza6edrhuDD0glbquwhzbPgUtKVDNNeHh//B0N48liJCs8tGjb5ErBawGRAqQirFjM2yEjPVFTdQLClp2aPhwdPuAWyBSFufUyJGNgjz7NE9E3DXh4b78fGByIFIexksBhjbVpWFISG5VVVW0jgHEuhdCSNr50aMz9JxHHYv+ykWAqE+BSFmY/44Zk24jJM0MNVAvKGjpnowMdPuACxApi0J9oBDfdvNYottHRa236vcB3AORsih2HyjaTGdvI6TvH6NHeyVOC/gPeM26TjzkScjuk7e9232cHTUqvX5w8FrndSa6Dk6Xnjt3ffv16w/a07IHxm6vcmKGVwZirdRBS8pi7E5NbVQ/OHiJic86ulVExDoTHAcwCRApi9E1JmaJ2bp5LDZCup0bNWqmuY4K+AqIlIU4N2rU2CCbzRRP80SEBgXNPHzPPbqmLQaBATwpAT7ynNh82e1dKMrIaNMuMjLf0Ypy+d6Z0/TFdcFW9aWqqu+2Hj6ckv7xx6ecD40pJjpQLSfiiX1KAc/KPWhJWYS2DRsuNns3jyXIZuvW75prnjXXUQFvA5GyAGWjRmUF2Wx9/fFMQ222Sb8MH+6Xxw6MASIV4OwbNiyuXlCQX5vQsWFhi//drx+i0S0K5pNiMMCD0lJe5DnpTV+mWXj40sqqquhLAstDZInwcmVtFLZqXQ6asz/7Nq1vbdaMdldHcHZ7SfCxWvwm0TZ6Y7WEsNcdPKoroCUVwJz4858nBdtsfQLhDENsttTSu+8eYoJDAV4GIhWg5KemxoWHhASU6RwbFrYwp1cvvzL/gX4gUgFK5+joRTY/e5onwkZI1L1t275j7qMERmOpOCkD526Sydcyrk42zd5cauUfueeeRyJCQuY4r3MxWZjvXcWE0etJueRrWEf3cerChRlxa9fOd3OorEclyudtY3Sah64fnpU8K7SkAoyCIUO6RYaGzgnkc4wODZ2x/rbbWpvgUIAXgEgFGO0jI3MC/RxtNlvUrc2a/csEhwK8AEQqgDg6YsTTQTZbghXONdhm6/rL8OEzTHAowMNApAIE2s1rEBLytJXOuWFo6FO77rijmwkOBXiQgA7m9JBRbkSgpcgIF6VdyreOiFh48dIVT5gN3nRxj0XGuSDf3bq6EFYU5+tyOVFmm/jIyAXTrrsu7eXCwtP2VawxLjLSVcqI8o2orjq3513bgWqmoyUVABy8++6naPfHiuceYrN1ndy585MmOBTgISBSfs72229PiAoNtfSPtGFIyITPBw++yQSHAjwARMrP6RoTs8DqdUDpFB39v9Ouuw7R6AFIQAVzKnhQnhgMLPKPKMGCMqJ0dfkfhw59IiYsbDpv8DC7ziXNbM9eByLPige7jXTUK+frYz0ol4pxyi+vrPwwft26ccwm7KlWcg5F5EnJprX4XrL50j/UQPGo0JLyUz4eNOgmKlBWrwdnwoODb98xePBg8xwRMAKIlB8yuXPn6C7R0a9ZvR54tI+MfPWhDh3Q7QsgIFJ+yKNdujwRHBTUyur1wINGoz+TmJhrviMDqvi1J+UhD0rkKemNceKtYz0qt+nNAwb07hYTU+t15JWc75Bdx3pMbL5sHBXxwKR3rP/E2yaY9aiYtCP/0LlzL9y0efMSjgfF86TYdSIfSzafGBBrpfulp/7qUaEl5UeM79AhultMzKtWrwcttGjQ4LGZiYktzX+kQAREyo94/LrrpgXbbPjhaSDIZosc167dYtMfKBACkfITaDcvOjT0QavXgwz1goK6fDNkyOP+c8SAh195Uh7woHgiLRv3JIp5YvMJZ8xknZ7UsNatY+def/2HIUFBLWi64lJtO0OLJyWbdomb4pwEC1tG9HW5VCxne60elIMQTv7GQ4eGPJ6fX2RfxfOkKgRpka+lxffSG2tl+PhAf/Go0JLyA55NTHzUIVBAnsEtWrx0R8uWUag6/wQiZXK2pqTc3jgs7C9Wrwc9hAUFdX4uMXGK/56BtYFImZh727aN6hwd/U+r14MRNAkLy1x6003J/n8m1sO0npTiXFCyHhRve6VxdE6wfhNvzi5RmVD6z7dpaTkNQ0IGVDDfEetJsfm8bWQ9KUecVEhEBIlo1+7y+uhuV+aYc3ft/PHbb9WLg1PffVf9F+snaYmTUvGgauUHXfm6Ll66dHja119nbDty5AzzMSJP6iKTZj0nkYfFWyeKrVKZF0tXLJVZPSqIlHgbn4jUmltvHdgjNrZ6hgNPi1TY1VeT8LZtSUR8fPXfdKF/U4EyknMlJaTi3Llq0aooK6tOn9u/v3od8YJIUc5XVGzr+f77j7DVJUhDpHwIREq8jddF6o6WLRu/0rPn9iBCIonBIhUcEUGiEhJIw4QE0iA+vvpvX/Pfo0dJ2f795Mz331cL12l7y4t4QKTo9l8dPz5p7I4dHzlXF1t9TBoi5UMgUuJtvC5S36alLaXdPEdar0g1uvFGEpGQQCKpMLVtyzkc83H6++/JyV27yFm7cF2uOANE6hIhZyfn5fV36vZBpCBS8mgUKb2iZMS4OpEohXI+w+02b/XpM6B7bOx858yLjChdFIgW7aZF3XgjadyrV/Xi7/xx9Cg5unMnObJ1KznvJFiEI1I8UapV0fb8soqK3X02b37AUaVMFbFpkWiJ8omCsMmKFjF6vJ9ZRAsiJS7jNZFKad486tWePT+prKqKdM7UKlJNBgwgsb16kZgbb+R8ZGBABev4F19UCxbtIqqKFKX49OmX792+/S2IFB+IlAAritTu1NT5kaGhA1xEqQ6Ror5Sk7Q0EnvjjdV+k5UoKykhhzduJCe++OKy+S4jUpeqqsrmFRWNeLuk5CBTbRApiJQYq4kU7ebdcNVV1d08LSJ1Vf/+pPGAASSyqyVfElMLKlAndu0ipStXkopjx2rl1SVSlD8qK3/s9cEHw5hdQqQgUmKsJFKTOnVqM6lTp0105D6pQ6RoSym2f39yVVoaqde0KWe34OSXX5IjGzdWPykkGkSKcvj8+fl3btvm7ANCpCBSrhj0NE9WlHgiJStCIlHiiVQ958TOwYNXNAwNvd6RZkWqKjycNMvIINekp1uuS6fK7999R0pWrCBlP/xQaw+hnMusXnAwWb5v36jXiot/tK9iReYCkxZ5WDyR0vvEUItIGTFI+UomRKo2VhWpd/v3H9s6ImKGc6azSDXu35+0evBBiJMip77/nuxfsKDavyJ1iFR5RcXex/LzJ3x94sRZiJQ9EyJVGyuK1IQOHVpkde68oYLzNI/GNlFxQrfOGH776CNyYOVKUnn0qMv+qEhRfjl/flXGxx/Pg0jZMyFStbGiSO1OTV3eICTkhgtOLScqSi2mTIEh7gGowU79qkNvvVVr5w6Rorx76NBDs7799kvm0yFSPsRnImWQKOl9KYKWCelkRYhN1yOuhP2rb99RnaKjp9Ech0i1GDmyevE55eWEHDxIyPHjNcv584SUltYclfPfPBo0IKR16ysZnTpd+Z92WVv5/iU3NNaqcO7cat+K1MzgeTnvwqVLvz2Wnz/6+99/L3MqwoqUbJooCJusaPHKiF7+wCIUA18IF0TKFY+L1Mj4+LaPd+nyTpDN1rD6A9q0IfGPPuqbISsnTtQIEhWe4uKa/6kQeRIqYlddVfM/FS+HkHmZ0g0bSMnKlSSIOd+yixe337lt25NOqyBSjg0gUuJigrRfiNTn9GleSEgS/bvZvfdWL16DtpJ2764RJLrQlpIZcIhVUpJXW1u0VfXjvHmXp5Mh9pbVJ7/++uTTBQXb7asgUo4NIFLiYoK06UVqU79+Y1tFRDwVHh9PWk+ZUj1FisehrSUqTDt21N1VMwu0y9ijx5XFCxx86y1ycOXKmi8sKIjOGlH28JdfDrV3+yBSjg0gUrU30bBOVqREpjgxoKUU5i49tUuXjqPi4xfG9OvXsM348Z4NK3C0mP7zH/8QJnc4BOvmmz3eLTxbUkIKnnuOVNqj1k9fvPjtsE8+eYzOJsNsyqZZUWLzedvImvEqMy2IjHQtMyvUiTdECyLlisdEasfgwf/q9PjjHWjsk8c4dIiQLVsIKSjwvLfkbaiPlZJCSJ8+hISHe+TD6RPA77OzL5vq3/7++/zH8vPfZjaDSDkKQKSE6/xGpN67667J/ebOzfRY946KEm01UZ8p0HG0roYOJaRxY4+c7N4FC8ihDRtot+/ca3v2ZL77889HnLIhUo4CECnhOr8QqXeefz7lrunTZ3uke0d9po0bzWOAexvaDfSQWNHpYPa8/DIVqn0pW7dmOmVBpBwFAkmkDHqxp+yLOkVpXqClSIQ0d+8oq1evThmWmvr34PBwY9/MQ1tMixdbV5xYPCRWZ/bvJwVPPEEKf/llxaS8vOX21awI/cGktYgUW0ZWtLS85JQVIZGxLj0gGSLlil+J1GeffTakb9++2ZzPUId6TjRi2grdOlloN5B6VoMGGepZUUN99/TpJKeg4KFVBw7sh0g5bQCRcsFvRMpwgaJP6zZsqPGdQN1Qg51G7hsYvkDjqfJfeOHnB1aunPzjmTMn2GwmDZEyEIiUK7pFqrCwcEKXLl3Gc/atBjXFadcu0J7WeRoasvDgg4Z1AemTvy1PPfVx6uuvszcfiJQHMZNIiUxxomCMi0RJONcTJ12fSdcSqQMHDvwtLi5uMGe/8tDW06JFNSIF1KBdwIyMmm6gAVw8d44se+aZf0x45ZUPnfbGCg6b5q2Tjb0SiRjRYK7LBnuawkjHa9YNhHbxDBMoKkyPPw6B0gttfb79NiGvvloj+joJjYggf3nxxanZjz3m+xcWWgS0pFxRakkZ6kHRHxW8J+OhraqsLEMi1yvKyyvH/OUv961ateo3tKScCnhAUCBSrkiLlGECRe/0s2f79zAWf4Ca6gZ0/84cPfrbbYMHTywoKGDjQCBSBuIxkTLAKNfykgQ2LRocLBIg3jrWGK/1bDsnJ6fX+PHjX+fsRw4aWkAFCua4d6BxVaNG6Q5V+P3kydIBAwc+WlBQ4Dz/FE+k2L6mqPUlEi2eSMkGgBrxluTamfCkzMVLL73U8f777/8f3QdFo8ZnzoRAeRNa5/SmoNOniomNbf3OO+885G+n709ApBS57bbbIrOysuYFBwc31LUj6j3R8ALgfWi3mt4caCtWB+3btx/45ZdfjsE36BkgUops2LBhXlhY2DW6dkLF6W12gD3wKnRYEW1R6RSq5OTk0cuWLeuNL894IFIK7N+/f1p0dHSSrp1QgaJdDuB7aDfbAKEaPXr0tOnTp7fDN2osvjTOZWc04K1jjXH2aR5rgrNP81hTnHCe3tVKr1u3LmXYsGFzOOW0A4EyJzREYcYMXdMXnzp16qf+/ftPY4x0wjHORWlZI523jjXORUa6lpk8vf4WZLSkJMjKymqenp4+U9dOIFDmxYAWVaNGjdrCSDcWiJQEs2bNmqXLKIdAmR8DhIoa6fCnjAMipZHdu3eP0uVDUXGCQPkHDqE6wU52oB3qT/Xo0UPfk19QjWEiZWNQ2YWGJUiwBAuWEGYJ5Sz12OXvf/971x49ekxTrhwqTggz8C+oUL3yinIcVUhISMT69eufsPueYbzrSrCw1yZ77Yqu9WANvxd20fIbZBePg5aUBiZOnPiocmHabUCYgX9C46ioUCkSFxeXnJOTc6PVq1EvECkBeXl5f27UqJHa7Gn0LkwvckSS+y90BlQdN5n77rtvardu3Tz47rLAByJVBwMHDoxMSkp6UHkHVKAwB7n/Q0cFKE6ZExoa2mD16tXq1xDwqkip9HfZRa8nxfOg3C7Lli17SvlpHn2DC+YhDxyop6hopHfs2LHfnDlzrnfyp7R4VKLrk/WoeD6VrAfF4hMPigUtKTfk5uYmtWjRIlWpMBUnKlIgcHAY6YpkZmaOwtWgBkTKDenp6ROUClIfCk/yAhNqpCvefJo2bZqwdu3aAVavQhUgUhxoK0rZLKdvdIEPFbhQkVIM9Bw8eDBaUwr4UqS84Unx+u3OC7e/P2LEiBeUzoh28zDtb+BDX46hQIMGDZquWrXqdoM8KC1xUuwi+j0Z7j8ZED+JlhTL1q1b76xfv34zpcLo5lkDHd2+1NTUP1u9+mSBSDHcfPPNDygVpBctunnWgbaYFZ72RURENFm1alU/q1efDBApJz744IPblFpR9GJFN89a0Kd91H9UAK0pOZREiu1nqvY12d1q8J/YbWTH6tXpSfXq1UttClh6sSKq3HrQMZkKsXC0NbVmzZrBBsRFGR0nZcRiOGhJ2Vm6dKnaEz16kWJ2A+ui6E316dMH4QgagUjZSUlJUQvcRNCmtaE3KYXW1NVXX911ypQp8VavPi1ApAght9xyS6RSdLniBQoCDMUb1cSJE9NwKYjxpEh5or9r9HxS1cucOXPULha0ogBRv1l16NChf0JCQjTPH1Xwn1Tmk/L5XFFaQEuKEJKYmCj/tIVGHaMVBRwo3rCeeeaZZNRh3VhepP72t79dqxR2sGWLR44H+Cn0hqUwXCYlJWUIvvK6sbxIjRgx4k7pQnQQMZ7oARaFG1dMTEybjIyMpqhL91hepFq2bHmLdCG0ogAPeuNSmBN9/Pjx6PLVgS8nvdNybLKLlHE+c+bMLkpdPbSigDs+/1y6apKTk/t7ySj3RDCnx7F0S2rkyJGDpQtR7wFj9IA7FG5gsbGxcXfffffVqFM+lhapNm3a3CxdCK0oUBd0hgQFA33ChAl4q4wbLCtSjzzySHOlrp7ihPzAQih0+Tp27NgNlwgfM016p9JfVg7uvOuuu26QPmIqUBhIDEQo3MiaNWvWzQTBm6bwoFgs25Lq2rWr/FM9tKKAFqhnKdnlo6++evHFF7uifl2xrEjFxsYmSRdChDnQyp490lXVp0+fBNSvK5YUqYcffvga6ffp0TsjnuoBrSi0uq+99lq0pDiEaNnIoEntXHarkM+KKpsO1pIeNmyYvB+lcGcEFkah1R0bGxvvdA2LrmVeA0O0jSjtcc+J1ZKqqqoqURlLtqTatGlzrXQhdPWALJLXDPWl0tPTMUSGwZIi1bhx4w7ShSBSQBaFa2bQoEFtUc+1saRIxcTE/EmqAPWjEHoAZFEQqa5du7ZBPddGkyelEbY/K0qzaNle9jNc+vX33XffNdJndvCgdBEAqqPPJWnfvj19wrdGwW8lCp6Tii8suw+h5yTCci2pnj17ykeZ46keUIG2viXfzVe/fv0GqOvaWE6kevXqJdfVI/CjgA6OHZMqS+eXQnXXxvLzSWkCLSmgisINLi0tDU/4nDDT2D1RvsrYPZftW7VqJf9uPYgUUEXh2unRo8fVWq5lA8bmseBFDH4JunpADwoi1a5dO7SknLCcSEVFRckHcgKgioJItWzZsgnq+wqWE6mQkJAIqQIKj5EBuAysAt0YGSelFy19YNk4Kf1jkxDECbxM06ZNmyiOs5P9fcjGPPkES7Wkxo0bJx8jBYBeJOeWiomJQXfPCUuJ1A033CAvUujuAb2cO4cq1AGe7olAdw8AnwKRAgCYGjMb51qMQan8S5cuQZSB6amqquIFUxrxYEm0vSnBjxYAYGogUgAAUwORAgCYGjN5UioERJ8bAAUsc22jJSWiAeYgA8CXWEqk8vPzf5Uu1Lq1R44FWIgIueGioDaWEqkVK1bIixQAemnVSmoH5eXliCB2wt89KdEk77ongUd3D3ib0tLSA6j0K1jOk6qoqJAbSIXuHtDDVVeh+nRiOZE6derUPhMcBrAKCiL1888/y729IcDB0z0RnTqZ+/iAuVEQqb1792KmPCfMJFJVCotoHyyXSktL/0/6yOBLAVUUROro0aNlXvo9iPJNAVpSWoAvBVRRuHZycnLwymwnLCdSu3btkm9JQaSAKnFxUgXLysrQ1WOwnEghoBN4DWoTNG4s9WlnzpyBac5gZk9Kyzai5RKzVL355ptHpI9M8m4IQDUKN7cff/yx0H7NqnhSLtc7PCk/5eTJk99IHTmNGIZ5DmRReDKM8ANXLClSR48elY+VQpcPyKJwzezcuRPR5gyWFKkDBw7slS7Uo4dHjgUEMJ07S5/bggULIFIMvhQp2f6yEX3y6vV5eXk/Sh+twgUHLAxtRYWHS53/kSNHiuq4lrUssr8PFlN6VJZsSWVnZ++trKwskyoEXwrIoNDytpvmgMGywZzHjh2Tj5dClw9oJSlJuqo+/fTTItSvK5YVqZKSEogU8Ax0KIzkHFKkpoWPlhQHy4rU4sWLP5cuREUKXT4gQuFm9tNPP+WjXvkYKVJGD4Y0wiivdLcsW7bs5/Ly8t+kzxKtKSCiTx/pKtqzZ88PdV2vGq51Lb8HIxavY+kBxvv37/9CuhBECtSFYlcvJyfnK9QrH0uLVEFBwbfShahIYbZF4I6UFOmqOXHiROmmTZuOok75WFqkxo0bt1N6OmHKzTd75HhAAKDwVG/fvn178NW7R5NIVTEY9NkqHpUooE3Uj3fZ/tChQzukj1zBcwAWgN68JGc9oCxZsuQzgR+ldTHao+JhxD6ksPykd5s2bdoiXYheiGhNARaFa4J29RYtWoRJ7urA8iI1derUb5Se8kGkgDN0GIzCrAc7duz4DPVYN5YXKUpRUdGH0oXoBYmXNAAHCoY5ZcaMGdtRh3VjpgHGKv1nWY+qgre8/vrr7yudQUaG4ZUC/BD6tFehZV1UVPTZnj17zri5Lo3wqES/DxVfWBcq/jZaUoSQ3NzcX48cOSJvoKM1BYj6zWrNmjWfov7EQKTsrF+/fo1SQbSmrA31ohRaUefOnTuWnZ2NAcUagEjZmTRp0v+dPXtWfsZOtKaszciRSqe/YcOGtVavOq14U6Rk+7Yqk36JPKg683ft2vWO0pk9+KBSMeDnKN6g6GurxowZ85E7j9RAj0rWk9LiC3sdtKScGDRo0PtK4Qg0bkrx6Q7wYxRvTnl5efIzcFgYiBTD1q1blysVHDoU07hYCepFKkSXX7x48fykSZPkQ14sDESKIT09fYtSa4rOZ/3AAx4+OmAKaMjBoEFKR7J9+/YtxcXF5/FFaseTIuWJuWxkPSmRR3WRt3zyySfLlM6YzpCAqVwCH3ozknzJArF7UVlZWe+5u+6YRcWjMtqD4uF1jwotKQ533nnnZqUnfcTuU6DbF7hQ71Hxae7GjRvXFBUVyc+6YXEgUm5Yvnz5a0oF0e0LXGhMFPUeFTh58uTBMWPGYJyeAhApN0yaNOkbpSh0Yu/24WlfYEFbx7SVrNDNo7z66qtvWr0KVVESKXb8jdYxOKLdavCfNM9h7maR6vc/++yz/1SaFI/Yg/zwavbAgX6fCtMCk5ppqne/8MIL3zLX3gVm0eJTia5d2bgplbF7Hp8/igUtqTpYunTpkYKCgvXKO5gyBf5UIECHvShOzUNDDiZPnrzS6lWoB4iUgOTk5OWnT58uUSpM42iysrx4tMBwaGtYh8f4/vvvr9+8efMxfDHqQKQ0MHv27JeUC9MnQTDS/RMaDzVjhvKhHz58eM/QoUMRuKkTiJQG5syZs/+rr75aobwD2lWAke5f0G467a4rGuW0m/fAAw8stG4FGofNqPcq2Gw2m2gTQZoVTJ6AhgjSoUw6TJDmXYHsusum0pkzZ5ZERka255TRxuLFdL5Y5eLAS1CBoi0oRaOc8t577705ZMgQ58kU2ShzUbpckP6D87EXBOmLTLqCSVcyaZ44XNKwzZVMAwQGLSkJ5s6dO1v5aR+xRypjbnTzo+NJHrG/Mp0RKKADiJQEf/3rX/e9++67Obp2AqEyNzq/n7Nnz54YMmTIfGtUlneASEkybNiwrXv37v1I104gVObEgO9l6tSprxQWFmLoi4F405NyKcKktXhSwUxa5FHVY9L1mTTrURGOJ+WSvuGGGxp+9NFH/4iKimrHKa8deFTmgHpQVKB0Dg5fsWLFgrFjx37G8ZsIZ53IcxJ5UP/lfIbIkxJ5UKzfxKYJx4OCJ2VG8vPzyx555JGZuvwpghaVKXCY5DoF6ocffthuFyhgMBApRVauXPnrc88996ghQqU4TzbQCQ3U1PkUj9jjoRISEt7A1+EZIFI6mD179r6NGzcu0r0jGkNFI9MxhMZ70CBbAwTq+PHjhwYOHPiyf528f2GYJ8Xigbgp3jrZuCnWo+J5UqxvxXpSbH6Df//73ylpaWnTOfuS49AhQhYtIqS0VPeuQB3Qm4IBrVcasJmRkTHjgw8+YL8w1k/irdPrQfE8KTYOShQXJfKgtHhSdWKEJwWRckVapM+OjXMAAAoRSURBVEjNSPfp8fHx+sPKy8trhKqgQPeuAINBBjm5Mlf5XxcuXHhQg+Dw1kGkNAKRckVJpIiRQkWhT/3efpuQ85gO2xCo/0SHuSi8PIGFESgCkXIPRMpkIkUpLi6e0bFjx36c/cpz4kRNq6q42JDdWRb6ZheD3jR94cKF8smTJ89yEigCkXKPv4uUSxEmrUWkZOOmRGP7iIbYKpFohe/du3d6+/btB3L2rcZ//kMnyEarShbaeqKzaeo0xx04taDYuwYrKDyREm0jEiVRDBRRGJsnEiV3E+G5xaAJMGsBkXJFt0jRfwwXKtqqeusteFVaoN4TbTkZOPOEwIOCSDkyIVL+I1KUbdu2DevXr99DnM9Qh3b9aKT68eOG7jZgoMGxo0YpT7HCQ4MHBZFyZEKk/EukKKtXr75z+PDhUzifow9qrNMuIMSqBhr3RMXJoK6dAxoH1bdv3xf27Nnj3NeGSLnBr0TK5YP0G+lEw/g+kWixIsWmCUe4RKIlTM+bNy8xKysrOyQkJILzeerQcIUtW2o8K6v6VVScaNdO8V14dVFSUvL1kCFD3igqKjrJbMYKiihNOKIkMsJFIsUKEOGIFCtKovmipOaK4gGR8lORov888cQT7Z5++unp0dHR8ZzP1I/VWlaOlyN4QJxIzfjMzT179nS8hooVDIiUGyBSfixSpPp1fD0abtq0aVqLFi16cz7XGKixTgUrEA12aohTYRo0yJB4Jx40xGD16tW5zIs8IVIagUj5uUg5+PDDD+8ZNGiQZ9/OQJ8Gfv55jWD5e+uKRojTxcMzRpw4caL0ySefXLRkyZK9TBZESiOBLlIuRTjrWFFit2FFSla0eOtkRYvd3kWk6DZPPvlku+eff/6F8PDwqzn5xkLHBFLBoq0rfxEshzAlJRn6pM4dRUVFn91zzz259gnrRIIhMrl5IiUrQrLzk/PWsaIjEimpuaKIh0SJBSLlildEiv6TlJTUcPXq1Q8bNpRGC1Sw9uypCWUwU5eQvj6K+ktUmDp39oowEXt4wcKFC/930qRJ+U6rIVL8tAsQKVcCSqQcLFq06NbMzMyphj/904JDtOjMC47FG1BBohHh9P+4OI95THVBX3+empqaU1xcfIrZDCLFT7sAkXIlIEWKbpOYmBiRm5s7snv37mmc7b0LbWXRkAYqWI7/KY60FqgAUaObLo6/6f9NmvhEkJyhraf58+fnTJ06dbd9NSsIECl+2gWIlCsBK1KOP2bPnp0wYcKE8TExMW045YBO8vLytmRmZq4rLi52VluIlLa0CwElUi4fLP+0j7dOJFKyT/+IhieArEiJZlbgRbWLtglbu3btwPT09PE+6QIGIEeOHCmaNWvWmwsWLGCf3BEFkWK3Z0WJFw0u2ofsDAY8kRJFlPvF0zwWiJQrphAp+s+f/vSniPnz52ckJSUNDQ0NxdzCCpw8efLga6+9lpudnV1kL83++AlEym2+EIiUeF1Ai5SDhISEmPnz5w9JTk5Og1hpo6ys7Pi6devWZ2ZmbmMKQKS05wuBSInXWUKkHJ+RkJAQAbGqGxqQ+d57732YmZm53b6h6MdPIFJu84VYXaS4xQRp2Yh0Nk0MmO1TlFYpUyvdvXv3mLlz5w7o3bt3RoMGDZpy9m85fvrpp/zly5d/kJ2d/S1z7uyPXcvsASLREpncvM/QK0qi6HHeOpEosZjCKGeBSLliepFyTi9evLjXgAEDBsbFxSVzPiegoV263bt3fzJv3rxP33333WP2c2V/3BCpK0CkpD4YImVkOnTo0KFNx48fn5ycnNw/0MMX6NuCP/7446+nTJnytYZuEETqChApqQ+GSBmZrnVMVLDuv//+3r179741EASLBl8ePHiweOfOnV/PmTPnK2YCOoiU+3UQKSPRKFqibUTBniLR4q2TFS0tMy3UKTIK+W4fAAwfPvzqESNGdLv++ut7N2/ePMFfDPfff//9QElJSeFXX331w8SJE/OcskQ/XpFI8YxzkUiJ8lVmKNArSjzBERnh0hHlLBApDZsJ8iFS7stUb5OVlRV/xx13dI2Li2vXqlWrrhEREU04Zb0ODbY8fPjwT3l5eYXz588vtM9GQDg/PIhUDRApbwOR0pWvWaScqD5PGtYwYsSItt27d2/XrFmzJs2bN28bFRXVxFPiRcWovLz8fGlp6YHCwsKfCgsLj73xxhsH7NlafngQqRogUt4GIqUrX1mk6kgHXXfddRHDhw+v9rTatWvXtGXLlrWEq6qqqs7v49NPP3VEeZNZs2YVafBIIFJXgEjZMY1IsXhJtHgiJWu2i0RLJWBUlNYyUFpWlESBsFoGfIsQ/Ui0/PBEoiRrpPO2kR3cqzL4V68oaXm7sC5R8oUg8ZC9yAAAwKtApAAApgYiBQAwNTy/xJ9g+8ysbyLqU/MC4vT2w73hs2gZKC0y/GUDX7UM+JZFywBXkVcjSmsZmCvrMcn6S1qO0xNvF/ZLD4oFLSkAgKmBSAEATA1ECgBgakzrSfH6xxpip4zoU8sOwlQJUNTrq4hioHjr9MZF8W5osp6UEXFSIj9Pti61bKPXF+OtE52XbGCmu3VuMasHxYKWFADA1ECkAACmBiIFADA1ECkAgKnxq2BO1ugzwEjn5bPCLWuks4a0FoNTZAaz+2SNXd7NRtYoFxnnKm/vYVEZACuqG73GupZtRJ+pMkOB3hkL/ML0NgK0pAAApgYiBQAwNRApAICpMe2kdyoovIFGy/ayXo3KZHGiwb2i7bV4UrJv1lHxpESoeISyQY+yaWJAoKWWwb8+96D8JXiTBS0pAICpgUgBAEwNRAoAYGoCypNiMegtyaJ8WY9KyzZ683nrZD0nT3hSLKIYNKIhpkx2gLeWFxjIek5aPCkW3W8TFuGvHhQLWlIAAFMDkQIAmBqIFADA1AS0J8Wi6FG57EaQr0X4ZT0nFb/IE/tk8UacFIsn4o1kPScWIyakC8gJ64wALSkAgKmBSAEATA1ECgBgaizlSWnBA+P/VOKLPOEfiW5I3vCkWFTGp+n1oIzwi4w4bims5EGxoCUFADA1ECkAgKmBSAEATA08KQEGxFYZMX5Qxfdikb0hGRFTZgR6/SLR9t7apxRW9qBY0JICAJgaiBQAwNRApAAApgYiBQAwNTDOJTFokLIIIwJKPfFSCl8ge4F6wuSGMe5D0JICAJgaiBQAwNRApAAApgaelMF4ybNi8cZkfr7C6AvU4xc8/CZjQUsKAGBqIFIAAFMDkQIAmBp4UibARz4Wi1U8Kd3Ac/IuaEkBAEwNRAoAYGogUgAAUwNPyg8xiYcVMMBjMjdoSQEATA1ECgBgaiBSAABTA0/KovirrwX/yHqgJQUAMDUQKQCAqYFIAQBMDTwpAICpQUsKAGBqIFIAAFMDkQIAmBqIFADA1ECkAACmBiIFADA1ECkAgKmBSAEAzAsh5P8BK2kOyJFW3wQAAAAASUVORK5CYII=",
                    width: 30,
                    height: 30,
                }
            })
        } catch (e) {
            new Error(e)
        }
    }

    sleep(): void {
        this._unbindEvents()
        this._DrawDirectionPoint.clearGraphics()
    }

    async wakeUp(): Promise<HTMLElement> {
        // handle popuping dialog after click first
        if(!this._GmapStreetViewInstance) await this._create()
        await this._handleClick()

        await this._bindEvents()
        return this._container
    }

    private _handleRotation(rotation){
        this._DrawDirectionPoint.rotatePoint(rotation,this.gampAngle)
    }

    private async _handleClick(){
        await this._DrawDirectionPoint.perform()
        await this._GmapStreetViewInstance.setPosition(this.drawedLoc)
    }

    private _rotationHandler: __esri.WatchHandle
    private _clickHandler: IHandle

    private async _bindEvents() {
        const view = this._Init.view as __esri.MapView
        this._rotationHandler = view.watch("rotation",this._handleRotation.bind(this))
        this._clickHandler = view.on("immediate-click",this._handleClick.bind(this))
    }
    private _unbindEvents() {
        this._rotationHandler.remove()
        this._clickHandler.remove()
    }

}