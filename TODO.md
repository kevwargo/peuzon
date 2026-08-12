- some kind of device management - first start on android should ask for a custom name and then store it
- leverage local phone storage as safety in case no net

### Huawei kills

```
08-12 17:55:22.953  1627  5283 I ActivityManager: Force stopping com.peuzon appid=10593 user=0: from pid 2635by app
08-12 17:55:22.955  1627  5283 I ActivityManager: Killing 28582:com.peuzon/u0a593 (adj 200): stop com.peuzonfrom pid 2635by app
08-12 17:55:22.961  1627  1736 I HwPowerManagerService: releaseWakeLockInternal wl: mLock:212307782 PARTIAL_WAKE_LOCK              'com.peuzon:tracker' ACQ=-13m51s876ms LONG (uid=10593 pid=28582)
08-12 17:55:22.962  1627  5283 D ActivityManager: cleanUpApplicationRecord app: 28582:com.peuzon/u0a593, bad: false, restarting: false, allowRestart: true
08-12 17:55:22.972  1627  5283 W ActivityManager: Scheduling restart of crashed service com.peuzon/.services.Tracker in 1000ms
08-12 17:55:22.972  1627  1627 I NotificationService: cancelNotificationLocked called,tell the app,reason = 8,sbn key = 0|com.peuzon|1|null|10593
08-12 17:55:22.975  1627  5283 I HwRestoreStateManager: com.peuzon doesn't support recovery
```
