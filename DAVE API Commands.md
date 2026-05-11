\#-----------------------------------------#

&#x20;        Command 1: Get Asset Data

\#-----------------------------------------#

curl --insecure \\

&#x20;    --request POST \\

&#x20;    --url https://dave.petronas.com:443/api/v2/assets/devices \\

&#x20;    --header 'accept: application/json' \\

&#x20;    --header 'api-key: Qiszsuyl2xgAW\_y9ahg5cwXm2pWb7NHKHsgvGJ7SIsU' \\

&#x20;    --header 'api-secret: Xdh\_3Oq6-iQM2aBHpXKtSY\_lqB69b9wMbTZ\_rfoEXas' \\

&#x20;    --header 'content-type: application/json' \\

&#x20;    --data '

{

&#x20; "include\_metadata": false,

&#x20; "page": {

&#x20;   "limit": 1000

&#x20; },

&#x20; "use\_cache\_entry": true,

&#x20; "include\_details": false,

&#x20; "query": "(\\"adapters\_data.gui.custom\_site\_id\\" == \\"**RYN0615**\\") and not (\\"specific\_data.connection\_label\\" == \\"ICS Data\\") and not (\\"specific\_data.connection\_label\\" == \\"SmartSD - Test\\") and not (\\"specific\_data.connection\_label\\" == \\"Risk Score\\") and not (\\"specific\_data.connection\_label\\" == \\"Station Compliance\\")",

&#x20; "fields\_to\_exclude": \[

&#x20;   "adapters",

&#x20;   "adapter\_list\_length",

&#x20;   "labels",

&#x20;   "adapter\_asset\_entities\_info",

&#x20;   "adapter\_list\_length\_details",

&#x20;   "\*\_details",

&#x20;   "meta\_data.client\_used"

&#x20; ],

&#x20; "fields": \[

&#x20;   "adapters\_data.gui.custom\_site\_id",

&#x20;   "specific\_data.data.hostname",

&#x20;   "specific\_data.data.network\_interfaces.ips\_v4\_preferred",

&#x20;   "specific\_data.data.network\_interfaces.mac",

&#x20;   "specific\_data.data.os.combined\_os\_fields\_preferred",

&#x20;   "adapters\_data.gui.custom\_device\_type",

&#x20;   "specific\_data.data.installed\_software.name\_version"

&#x20; ]

}

' > asset\_data.json







\#-----------------------------------------#

&#x20;      Command 2: Get Asset Changes

\#-----------------------------------------#



curl --insecure \\

&#x20;    --request POST \\

&#x20;    --url https://dave.petronas.com:443/api/v2/assets/devices/asset\_investigation/**23cdef1bf9e946548ac80a1098b2c029** \\

&#x20;    --header 'accept: application/json' \\

&#x20;    --header 'api-key: Qiszsuyl2xgAW\_y9ahg5cwXm2pWb7NHKHsgvGJ7SIsU' \\

&#x20;    --header 'api-secret: Xdh\_3Oq6-iQM2aBHpXKtSY\_lqB69b9wMbTZ\_rfoEXas' \\

&#x20;    --header 'content-type: application/json' \\

&#x20;    --data '

{

&#x20; "time\_range": {

&#x20;   "period": {

&#x20;     "relative\_type": "last",

&#x20;     "unit": "days",

&#x20;     "count": 7

&#x20;   }

&#x20; }

}

' > asset\_changes.json







