# Tessel Network Example

![Screenshot](screenshot.png)


## Install Requirements

```
npm i -g t2-cli bower
npm i
bower install
```


## Running Requirements

A Tessel that have NodeJS >= 6.


## Run at Tessel

```
t2 run index.js --compress=false
```
Open http://Tessel_IP/. You can find Tessel_IP either looking at your DHCP provider (for ex modem), or with a network scanner like [fing](https://www.fing.io/).

**Note** : You may lost Tessel connection after running the command. Which will changed according to
`database/configuration.json` file.


## Run at development machine

```
PORT=3000 node index.js
```
Open http://localhost:3000/


## Deploy to Tessel

```
t2 push index.js --compress=false
```

Note: Pushing without compression due to a bug.


## Debug

To open a ssh channel over ethernet cable and get app output, apply the instructions below.

* **Differ Devices**

  Connect over wlan0 and change MAC address. (PC/eth:on, PC/wifi:on, T/eth:off, T/wifi:on)

  ```
  $ t2 root
  # ifconfig
  ```

  Ensure `eth0` and `wlan0` HWadd are different. If not, change with commands below (tip: change last digit):

  ```
  # ifconfig eth0 down
  # ifconfig eth0 hw ether XX:XX:XX:XX:XX:XX
  # ifconfig eth0 up
  # ifconfig
  ```

  See http://jhshi.me/2015/01/19/fix-mac-address-clone-in-openwrt/index.html for more info.

* **Push The App**

  Push without compress.

  ```
  t2 push index.js --compress=false
  ```

* **Open Ethernet Channel**

  Connect over eth0 without wlan0 and open a ssh console. (PC/eth:on, PC/wifi:off, T/eth:on, T/wifi:off)

  ```
  $ t2 root
  ```

* **Manually Running**

  Kill and run manually the node app at the ssh console that you open above.

  ```
  kill -9 `pgrep node`
  /app/start
  ```

* **Use The App**

  Start using the app from your browser (PC/eth:on, PC/wifi:on, T/eth:on, T/wifi:on).
