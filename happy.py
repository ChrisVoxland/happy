import webapp2
import jinja2
import os
import re
import cgi
import datetime
import urllib
import urllib2
import json
import logging
import ast

from google.appengine.ext import db


template_dir = os.path.join(os.path.dirname(__file__), 'templates')
jinja_environment = jinja2.Environment(loader = jinja2.FileSystemLoader(template_dir),
                               autoescape = True)


def bar_key(bar_name=None):
	return db.Key.from_path('Bar', bar_name)


#maybe redo this to use appropriate types later instead of just having strings
class Bar(db.Model):
	barName = db.StringProperty()
	barAddress = db.StringProperty()
	barCity = db.StringProperty()
	barState = db.StringProperty()
	barZip = db.StringProperty()
	barLat = db.StringProperty()
	barLng = db.StringProperty()
	barFullAddress = db.StringProperty()
	barContentString = db.StringProperty()
	barStart = db.StringProperty()
	barEnd = db.StringProperty()
	barDayString = db.StringProperty()	
	barLatlng = db.StringProperty()
	




class Handler(webapp2.RequestHandler):
	#use write function as a ghetto console to test stuff
	def write(self, *a, **kw):
		self.response.out.write(*a, **kw)

	def render_str(self, template, **params):
		t = jinja_environment.get_template(template)
		return t.render(params)

	def render(self, template, **kw):
		self.write(self.render_str(template, **kw))

	def decode(self, string):
		urllib2.unquote(self.request.get(string).encode('utf-8'))



class Front(Handler):
    def get(self):
    	self.render('/map.html')

#sort out ancestor key stuff
#add memcache support
#may eventually have to have time limit on lat/lng in db to abide by terms
class Map(Handler):
	def post(self):
		
		jsonbar = json.loads(self.request.body)
		bar_name = json.dumps(jsonbar['name'])
		bar_address = json.dumps(jsonbar['address'])
		bar_city = json.dumps(jsonbar['city'])
		bar_state = json.dumps(jsonbar['state'])
		bar_zip = json.dumps(jsonbar['zip'])
		bar_latlng = json.dumps(jsonbar['latlng'])
		bar_start = json.dumps(jsonbar['start'])
		bar_end = json.dumps(jsonbar['end'])
		bar_daystring = json.dumps(jsonbar['daystring'])
		bar_contentstring = json.dumps(jsonbar['contentstring'])
		bar_fulladdress = json.dumps(jsonbar['fulladdress'])
		
		
		
		#jbar = json.dumps(ast.literal_eval(json.dumps(jsonbar)))


		# only passes when request to make new bar is made by client
		if bar_latlng == '"no coords"':
			#sendbars is there to send a consitant format to client - everything will be in an array same function can be used to read results of search
			bars = Bar.all()
			sendbars = []

			#add more checks, have alerts to notify of possible spelling errors?
			#improve efficiency so it's not going through whole db if finds match
			#checks to see if bar already in db. if it is, sends out latlng, otherwise adds it
			#look into async api for datastore
			#maybe use filter instead of the ifs
			have = False 
			#go through db - if name and zip match for place trying to be created, send that bar's info to client to have it displayed
			for each in bars:
				
				if each.barName == bar_name:
					if each.barZip == bar_zip:
						#create a json object of bar match from db and send it to client
						jbar = {'fulladdress': str(each.barFullAddress), 'lat': str(each.barLat), 'lng': str(each.barLng), 
						'name': str(each.barName), 'contentstring': str(each.barContentString)}						
						
						sendbars.append(jbar)
						have = True						
						
						send = json.dumps(sendbars)
						
						self.response.out.write(send)
						logging.error('sending ofund bar')
						logging.error(each.barLat)
						
						break
			
			if have == False:
				self.response.out.write('call codeAddress')			

		#adds new db entry for bar with coords when one isn't found in db
		else:
			bar_lat = json.dumps(jsonbar['lat'])
			bar_lng = json.dumps(jsonbar['lng'])
			
			

			bar = Bar(parent=bar_key(bar_name))
			bar.barName = bar_name
			bar.barAddress = bar_address
			bar.barCity = bar_city
			bar.barState = bar_state
			bar.barZip = bar_zip
			bar.barLatlng = bar_latlng
			bar.barLat = bar_lat
			bar.barLng = bar_lng
			bar.barFullAddress = bar_fulladdress
			bar.barStart = bar_start
			bar.barEnd = bar_end
			bar.barDayString = bar_daystring
			bar.barContentString = bar_contentstring
			bar.put()
			logging.error(bar_zip)
			self.response.out.write('entered')
			#testing code
		

#possibly use this as abstracted function in the check for new bar
#queries db for matching zips, puts info for matching bars in json object that is sent to server
#make this more efficient later
class Search(Handler):
	def get(self, zipcode):
		found = False
		sendbars = []
		zipcode = '"' + zipcode + '"'
		logging.error(zipcode)
		q = Bar.all()
		for each in q:
			if str(each.barZip) == zipcode:
				found = True
				logging.error('match!')
				jbar = {'fulladdress': str(each.barFullAddress), 'lat': str(each.barLat), 'lng': str(each.barLng), 'name': str(each.barName), 'contentstring': str(each.barContentString)}
				sendbars.append(jbar)

		
		if found == True:
			logging.error('found and sent!')	
			self.response.out.write(json.dumps(sendbars))
		else:
			self.response.out.write('None Found')




			
class JSON(Handler):
	
	
	def post(self):

		#use loads() on what i get from server
		jsonbar = json.loads(self.request.body)
		output = json.dumps(jsonbar['name'])
		#logging.error(output)
		logging.error(output)
		self.response.out.write()
			
				

class Test(Handler):
	def get(self):
		

		bars = Bar.all()
		

		for bar in bars:
			self.response.out.write(bar.barLatlng)
			

class Clear(Handler):
	def get(self):
		bars = Bar.all()
		db.delete(bars)
		self.redirect('/')
		
		bar = Bar(parent=bar_key('first'))
		bar.barName = 'first'
		bar.put()


#Form will later work with full addresses - use separate fields for each entry. use regex to verify validity
#the actual geocoding will be done from the client's browser. the returned values will then be put in cache/database
#class Form(Handler):
#	def get(self):
		#this code gets the lat/long of a new address. should eventually be done clientside to not reach limits. clients then send back address to put in db
		#add formatting stuff to take out wierd characters
		#address = self.request.get("address")		
		#address = address.replace(' ', '+')		
		#url = "http://maps.googleapis.com/maps/api/geocode/json?address=%s" % address
		#url = url + "&sensor=false"		
		#info = urllib2.urlopen(url)
		#code = info.read()
		#code = json.loads(code)
		#thing = code["results"][0]["geometry"]["location"]
		#lat = thing["lat"]
		#lng = thing["lng"]
		#latlng = str(lat)+' ' + str(lng)
		#self.write(latlng)

		

# will have "add new happy hour" button - this will send a geocoding request and save result to place pin on map
# initial search will be by zip code - zooms map to area and displays pins for all bars, eventually based on time


app = webapp2.WSGIApplication([
    ('/', Front),
    ('/map', Map),
    ('/test', Test),
    ('/clear', Clear),
    ('/json', JSON),
    ('/search/(\d{5})', Search)
], debug=True)

#maybe eventually connect it to google users? allow people to log in, could allow eventual connection to their equivalent to yelp