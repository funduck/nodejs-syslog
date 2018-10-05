# nodejs-syslog
Write to syslog via unix socket or UDP

### examples:  
#### unix socket:    
```
const syslog = require('nodejs-syslog');
syslog.setPath('/dev/log')
syslog.write('mesage', 'user', 'debug')
```

#### UDP:  
```
const syslog = require('nodejs-syslog');
syslog.setPath(null)
syslog.setHost('127.0.0.1')
syslog.setPort(514)
syslog.write('mesage', 'user', 'debug')
```
