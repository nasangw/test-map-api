import x2js from 'x2js/xml2json';
import Location from './_location';
import LayerBusStop from './_layerBusStop';

const keyDataOrKr = 'KqC6MV8UsZrwWZNmdaDN34Ii7nC25rAqDtnNEPN40DSXAiHXIswyqPb/CPqhgmH2HORnAEYpSFsky8ExSyd1VA==';
const apiURI = {
    getStationByPos: 'http://ws.bus.go.kr/api/rest/stationinfo/getStationByPos',
}

class App {
    constructor() {
        this.markerBusStop = {};
        this.imgBusStop = '/src/img/icon-bus.png';
        // this.imgBusStop = '/src/img/transparent.png';
        this.init();
    }

    init() {
        const location = new Location();
        this.customLayer = new LayerBusStop();

        location.getPosition()
            .then(data => {
                this.myLocationData = data;
                this.initMap(data);
                this.setBusStop();
            })
            .catch(error => {
                console.log(error);
            });
    }

    initMap(info) {
        if(!info) {
            return;
        }

        const { latitude, longitude } = info.coords;
        const container = document.querySelector('#map');
        const optionsForMap = {
            center: new daum.maps.LatLng(latitude, longitude),
            level: 3
        };

        // generate map.
        this.map = new daum.maps.Map(container, optionsForMap);

        // 지도에 현재위치를 생성하고 표시한다
        this.markerHere = new daum.maps.Marker({
            position: new daum.maps.LatLng(latitude, longitude),
            map: this.map
        });
    }

    setBusStop() {
        this.getDataForBusStop()
        .then(res => {
            const list = res.ServiceResult.msgBody.itemList;

            var markerImageUrl = this.imgBusStop, // 마커 이미지의 주소
                markerImageSize = new daum.maps.Size(24, 24), // 마커 이미지의 크기
                markerImageOptions = { 
                    offset : new daum.maps.Point(12, 12)// 마커 좌표에 일치시킬 이미지 안의 좌표
                };

            list.forEach(stop => {
                // 마커 이미지를 생성한다
                var markerImage = new daum.maps.MarkerImage(markerImageUrl, markerImageSize, markerImageOptions),
                    latitude = stop.gpsY,
                    longitude = stop.gpsX,
                    wtmX = stop.posX,
                    wtmY = stop.posY,
                    geocoder = new daum.maps.services.Geocoder(),
                    transLat, transLng, template;

                // 지도에 마커를 생성하고 표시한다
                this.markerBusStop[stop.arsId] = new daum.maps.Marker({
                    position: new daum.maps.LatLng(latitude, longitude),
                    image: markerImage,
                    map: this.map
                });

                // generate customLayer for BusStop
                this.setLayerForBusStop(stop);

                // if mapLevel higher than 3, hide markerBusStop when init map
                if(this.map.getLevel() > 3) {
                    this.showHideMarkerBusStop();
                }

                // bind zoom_changed event: zoom level이 4이상일 경우 버스정류장의 마커를 제거
                daum.maps.event.addListener(this.map, 'zoom_changed', () => {
                    if(this.map.getLevel() >= 4) {
                        this.showHideMarkerBusStop();
                    }else {
                        this.showHideMarkerBusStop(this.map);
                    }
                });
            });
        })
        .catch(error => {
            console.log(error);
        });
    }

    setLayerForBusStop(stop) {
        if(!stop) {
            return;
        }

        const template = this.customLayer.getTemplate(stop);

        this.customLayer.setOverlay({
            template, 
            map: this.map, 
            marker: this.markerBusStop[stop.arsId],
            arsId: stop.arsId,
        });
    }

    showHideMarkerBusStop(param) {
        if(!Object.keys(this.markerBusStop).length) {
            return;
        }

        const value = param ? param : null;
        for(const key in this.markerBusStop) {
            this.markerBusStop[key].setMap(value);
        }
    }

    getDataForBusStop() {
        const { latitude, longitude } = this.myLocationData.coords;
        const uri = new URL(apiURI.getStationByPos);
        const params = {
            serviceKey: keyDataOrKr, // api Key
            tmX: longitude,
            tmY: latitude,
            radius: 500, // unit: meter
        }

        // set params to url
        Object.keys(params).forEach(key => {
            uri.searchParams.append(key, params[key]);
        });

        return new Promise((resolve, reject) => {
            fetch(uri)
            .then(res => {
                return res.text();
            })
            .then(res => {
                const xml2js = new x2js();
                const parseData = xml2js.xml_str2json(res);
                resolve(parseData);
            })
            .catch(error => {
                reject(error);
            });
        });
    }

    // transCoord() {
    //     geocoder.transCoord(wtmX, wtmY, (result, status) => {
    //         if(status === daum.maps.services.Status.OK) {
    //             transLat = result[0].y;
    //             transLng = result[0].x;

    //             this.markerBusStop[stop.arsId] = new daum.maps.Marker({
    //                 position: new daum.maps.LatLng(transLat, transLng),
    //                 image: markerImage,
    //                 map: this.map
    //             });
    //         }
    //     }, {
    //         input_coord: daum.maps.services.Coords.WTM,
    //         output_coord: daum.maps.services.Coords.WGS84,
    //     });
    // }
}

const app = new App();