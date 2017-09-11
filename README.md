# domestic-bot

This is a bot that runs at our house's server, and can send messages to our Telegram family group.  
It makes life easier by:

 - Alerting us when somebody rings the doorbell, and also serves as a logbook
 - Alerting us when electricity goes out (which happens more frequently than we'd like)
 - Letting us open the door through a command (WIP)

More tasks will be added as we add more domotic nodes (sensors, actuators) to our house.

However, many basic tasks (such as: controlling lights, doors, appliances, etc.)
are already handled by our [Homeassistant](https://homeassistant.io) install so this
bot really is for either *super important notifications* which are nice to have
in our family chat, or other tasks difficult to perform by Homeassistant (not necessarily
Telegram related).

**Note**: this is quick 'n dirty code for personal use. It's open source
just in case anyone is curious about my setup, but I don't expect you to
use it.
